import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  console.log('🔍 PDF API: Starting request processing');
  
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    const bankHint = (formData.get('bank') as string | null)?.toLowerCase() || '';
    const dryRun = (formData.get('dryRun') as string | null) === 'true';
    
    console.log('🔍 PDF API: Form data received');
    console.log('🔍 PDF API: File details:', {
      name: file?.name,
      type: file?.type,
      size: file?.size
    });
    
    if (!file) {
      console.log('❌ PDF API: No file provided');
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      console.log('❌ PDF API: Invalid file type:', file.type);
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads');
    const toolsDir = join(process.cwd(), 'tools');
    
    console.log('🔍 PDF API: Directories:', { uploadsDir, toolsDir });
    
    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `statement_${Date.now()}.pdf`;
    const filepath = join(uploadsDir, filename);
    
    console.log('🔍 PDF API: Saving file to:', filepath);
    await writeFile(filepath, buffer);
    console.log('✅ PDF API: File saved successfully');

    try {
      // Update the Python script to use the uploaded file
      const csvOutput = join(uploadsDir, `extracted_${Date.now()}.csv`);
      const jsonOutput = join(uploadsDir, `extracted_${Date.now()}.json`);
      
      // Create a temporary Python script that writes output to file instead of stdout
      const tempScript = `
import sys
import os
sys.path.append(r'${toolsDir.replace(/\\/g, '\\\\')}')

PDF_FILE = r"${filepath.replace(/\\/g, '\\\\')}"
BANK_HINT = r"${bankHint}"
CSV_FILE = r"${csvOutput.replace(/\\/g, '\\\\')}"
JSON_FILE = r"${jsonOutput.replace(/\\/g, '\\\\')}"
from pathlib import Path
import pandas as pd
import json

def main():
    pdf_path = Path(PDF_FILE)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    df = None
    try:
        # Use accurate parser which correctly handles multi-line transactions
        from accurate_parser import parse_bank_statement_accurately
        df = parse_bank_statement_accurately(pdf_path)
        print(f"Accurate parser extracted {len(df)} transactions", file=sys.stderr)
    except Exception as e:
        print(f"Accurate parser failed: {e}", file=sys.stderr)
        try:
            # Fallback to new bank-specific parser
            from bank_statement_parser import parse_bank_statement
            df = parse_bank_statement(pdf_path)
            print(f"Bank-specific parser extracted {len(df)} transactions", file=sys.stderr)
        except Exception as e2:
            print(f"Bank-specific parser also failed: {e2}", file=sys.stderr)
            df = pd.DataFrame()
    
    if df.empty:
        result = {"success": True, "transactions": [], "count": 0}
        with open(JSON_FILE, 'w') as f:
            json.dump(result, f)
        print(json.dumps(result))
        return
    
    # Convert dates and ensure JSON-serializable - improved date parsing
    def normalize_date(date_val):
        """Normalize date to ISO format (YYYY-MM-DD)"""
        if pd.isna(date_val):
            return None
        try:
            # Try parsing with pandas (handles multiple formats)
            parsed = pd.to_datetime(date_val, errors='coerce')
            if pd.isna(parsed):
                return None
            # Return in ISO format
            return parsed.strftime('%Y-%m-%d')
        except:
            return None
    
    # Apply date normalization
    if 'date' in df.columns:
        df["date_iso"] = df["date"].apply(normalize_date)
        # Fill any missing date_iso from date column if available
        df["date_iso"] = df["date_iso"].fillna(df["date"].apply(normalize_date))
    else:
        df["date_iso"] = None
    
    # Filter out rows with invalid dates
    df = df[df["date_iso"].notna()].copy()
    
    # Best-effort: stringify any remaining date/datetime columns
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime('%Y-%m-%d')
    
    # Persist CSV as a fallback
    try:
        df.to_csv(CSV_FILE, index=False)
    except Exception:
        pass
    
    # Write JSON to file (primary method for large outputs)
    try:
        json_records = df.to_json(orient='records')
        result = {"success": True, "transactions": json.loads(json_records), "count": int(len(df))}
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)
        # Also print to stdout for compatibility, but truncate if too large
        result_str = json.dumps(result, ensure_ascii=False)
        if len(result_str) < 1000000:  # Only print if under 1MB
            print(result_str)
        else:
            print(json.dumps({"success": True, "transactions": [], "count": len(df), "file": JSON_FILE}))
    except Exception as e:
        print(f"JSON serialization error: {e}", file=sys.stderr)
        # Final fallback: basic dict conversion
        records = []
        for _, row in df.iterrows():
            obj = {}
            for k, v in row.items():
                if hasattr(v, 'isoformat'):
                    obj[k] = v.isoformat()
                else:
                    obj[k] = str(v) if not isinstance(v, (int, float)) else v
            records.append(obj)
        result = {"success": True, "transactions": records, "count": len(records)}
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)

if __name__ == "__main__":
    main()
`;

      const tempScriptPath = join(uploadsDir, `temp_parser_${Date.now()}.py`);
      await writeFile(tempScriptPath, tempScript);

      // Execute the Python script
      console.log('🔍 PDF API: Executing Python script:', tempScriptPath);
      console.log('🔍 PDF API: Python command:', `python "${tempScriptPath}"`);
      
      // Use increased maxBuffer (10MB) to handle large PDF outputs
      const { stdout, stderr } = await execAsync(`python "${tempScriptPath}"`, { 
        timeout: 90_000,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      console.log('🔍 PDF API: Python stdout:', stdout);
      if (stderr) console.log('⚠️ PDF API: Python stderr:', stderr);
      
      // Keep temporary script for later cleanup
      console.log('📁 PDF API: Temporary script will be cleaned up after import');

      // Parse JSON - first try stdout, then fallback to JSON file, then CSV file
      let transactions: any[] = [];
      let transactionCount = 0;
      
      try {
        // Try to parse from stdout first
        const trimmed = stdout.trim();
        let jsonText = '';
        const firstBrace = trimmed.lastIndexOf('{');
        const lastBrace = trimmed.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonText = trimmed.slice(firstBrace, lastBrace + 1);
        }
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          if (parsed.file) {
            // Output indicates JSON was written to file
            const fileContent = await readFile(jsonOutput, 'utf-8');
            const fileParsed = JSON.parse(fileContent);
            transactions = Array.isArray(fileParsed?.transactions) ? fileParsed.transactions : [];
            transactionCount = fileParsed?.count || 0;
          } else {
            transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
            transactionCount = parsed?.count || 0;
          }
        }
      } catch (error) {
        console.log('⚠️ PDF API: Failed to parse stdout, trying JSON file...');
      }
      
      // If stdout parsing failed or returned empty, try reading from JSON file
      if (transactions.length === 0) {
        try {
          const fileContent = await readFile(jsonOutput, 'utf-8');
          const parsed = JSON.parse(fileContent);
          transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
          transactionCount = parsed?.count || 0;
          console.log(`✅ PDF API: Read ${transactions.length} transactions from JSON file`);
        } catch (error) {
          console.log('⚠️ PDF API: Failed to read JSON file, trying CSV...');
        }
      }

      if (!transactions.length) {
        try {
          const csvContent = await import('fs').then(fs => fs.promises.readFile(csvOutput, 'utf-8'));
          const lines = csvContent.split('\n').filter(line => line.trim());
          if (lines.length >= 2) {
            const headers = lines[0].split(',');
            const rows: any[] = [];
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',');
              if (values.every(v => !v.trim())) continue;
              const row: any = {};
              headers.forEach((h, idx) => {
                row[h.trim()] = values[idx]?.trim() || '';
              });
              rows.push(row);
            }
            transactions = rows;
          }
        } catch {}
      }

      if (!transactions.length) {
        return NextResponse.json({ 
          success: true, 
          transactions: [], 
          count: 0,
          tempFiles: [filepath, csvOutput, tempScriptPath].filter(Boolean)
        });
      }

      // Keep files for cleanup after successful import
      console.log('📁 PDF API: Keeping files for import:', { filepath, csvOutput, tempScriptPath });

      console.log('✅ PDF API: Success! Returning', transactions.length, 'transactions');
      
      return NextResponse.json({ 
        success: true, 
        transactions, 
        count: transactions.length,
        tempFiles: [filepath, csvOutput, tempScriptPath].filter(Boolean)
      });

    } catch (error) {
      // Clean up files on error
      try {
        await unlink(filepath);
      } catch {}
      
      console.error('❌ PDF API: PDF parsing error:', error);
      return NextResponse.json({ 
        error: 'Failed to parse PDF. Please ensure it\'s a valid bank statement.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ PDF API: PDF upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to process PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
