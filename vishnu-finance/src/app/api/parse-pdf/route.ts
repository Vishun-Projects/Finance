import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
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
      
      // Create a temporary Python script preferring enhanced_bank_parser (JSON stdout)
      const tempScript = `
import sys
import os
sys.path.append(r'${toolsDir.replace(/\\/g, '\\\\')}')

PDF_FILE = r"${filepath.replace(/\\/g, '\\\\')}"
BANK_HINT = r"${bankHint}"
CSV_FILE = r"${csvOutput.replace(/\\/g, '\\\\')}"
from pathlib import Path
import pandas as pd
import json

def main():
    pdf_path = Path(PDF_FILE)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    df = None
    try:
        from enhanced_bank_parser import parse_bank_statement_advanced
        df = parse_bank_statement_advanced(pdf_path, bank_hint=BANK_HINT)
    except Exception as e:
        # Fallback
        from accurate_parser import parse_bank_statement_accurately
        df = parse_bank_statement_accurately(pdf_path)
    
    if df.empty:
        print(json.dumps({"success": True, "transactions": [], "count": 0}))
        return
    
    # Convert dates and ensure JSON-serializable
    df["date_iso"] = pd.to_datetime(df.get("date", pd.Series(dtype=str)), errors="coerce").dt.strftime('%Y-%m-%d')
    # Best-effort: stringify any remaining date/datetime columns
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime('%Y-%m-%d')
    # Persist CSV as a fallback for the Node layer
    try:
        df.to_csv(CSV_FILE, index=False)
    except Exception:
        pass
    # Use pandas to_json for safe serialization
    try:
        json_records = df.to_json(orient='records')
        print(json.dumps({"success": True, "transactions": json.loads(json_records), "count": int(len(df))}))
    except Exception:
        # Final fallback: basic dict conversion with string casting
        records = []
        for _, row in df.iterrows():
            obj = {}
            for k, v in row.items():
                if hasattr(v, 'isoformat'):
                    obj[k] = v.isoformat()
                else:
                    obj[k] = str(v) if not isinstance(v, (int, float)) else v
            records.append(obj)
        print(json.dumps({"success": True, "transactions": records, "count": len(records)}))

if __name__ == "__main__":
    main()
`;

      const tempScriptPath = join(uploadsDir, `temp_parser_${Date.now()}.py`);
      await writeFile(tempScriptPath, tempScript);

      // Execute the Python script
      console.log('🔍 PDF API: Executing Python script:', tempScriptPath);
      console.log('🔍 PDF API: Python command:', `python "${tempScriptPath}"`);
      
      const { stdout, stderr } = await execAsync(`python "${tempScriptPath}"`, { timeout: 90_000 });
      
      console.log('🔍 PDF API: Python stdout:', stdout);
      if (stderr) console.log('⚠️ PDF API: Python stderr:', stderr);
      
      // Keep temporary script for later cleanup
      console.log('📁 PDF API: Temporary script will be cleaned up after import');

      // Parse JSON from stdout robustly; fallback to CSV file
      let transactions: any[] = [];
      try {
        const trimmed = stdout.trim();
        let jsonText = '';
        const firstBrace = trimmed.lastIndexOf('{');
        const lastBrace = trimmed.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonText = trimmed.slice(firstBrace, lastBrace + 1);
        }
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
        }
      } catch {}

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
