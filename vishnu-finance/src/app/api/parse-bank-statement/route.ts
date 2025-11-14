import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  console.log('🏦 Parse Bank Statement API: Starting request processing');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bankType = formData.get('bankType') as string | null;
    
    console.log('🏦 Parse Bank Statement API: Form data received');
    console.log('🏦 Parse Bank Statement API: File details:', {
      name: file?.name,
      type: file?.type,
      size: file?.size
    });
    
    if (!file) {
      console.log('❌ Parse Bank Statement API: No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Determine file type
    const fileName = file.name.toLowerCase();
    let fileType = null;
    let validMimeTypes: string[] = [];
    
    if (fileName.endsWith('.pdf')) {
      fileType = '.pdf';
      validMimeTypes = ['application/pdf'];
    } else if (fileName.endsWith('.xls')) {
      fileType = '.xls';
      validMimeTypes = ['application/vnd.ms-excel'];
    } else if (fileName.endsWith('.xlsx')) {
      fileType = '.xlsx';
      validMimeTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    }
    
    if (!fileType) {
      console.log('❌ Parse Bank Statement API: Unsupported file type:', file.name);
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload PDF, XLS, or XLSX files.' 
      }, { status: 400 });
    }

    if (validMimeTypes.length && file.type && !validMimeTypes.includes(file.type)) {
      console.log('❌ Parse Bank Statement API: Unsupported MIME type:', file.type);
      return NextResponse.json(
        { error: 'Unsupported file MIME type. Please upload a valid bank statement file.' },
        { status: 400 },
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads');
    const toolsDir = join(process.cwd(), 'tools');
    
    console.log('🏦 Parse Bank Statement API: Directories:', { uploadsDir, toolsDir });
    
    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `statement_${Date.now()}${fileType}`;
    const filepath = join(uploadsDir, filename);
    
    console.log('🏦 Parse Bank Statement API: Saving file to:', filepath);
    await writeFile(filepath, buffer);
    console.log('✅ Parse Bank Statement API: File saved successfully');

    try {
      const csvOutput = join(uploadsDir, `extracted_${Date.now()}.csv`);
      const jsonOutput = join(uploadsDir, `extracted_${Date.now()}.json`);
      
      const tempScript = `
import sys
import os
sys.path.append(r'${toolsDir.replace(/\\/g, '\\\\')}')

from bank_statement_parser import parse_bank_statement
from pathlib import Path
import pandas as pd
import json

def main():
    file_path = Path(r"${filepath.replace(/\\/g, '\\\\')}")
    bank_type = "${(bankType || '')}"
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    print(f"Parsing bank statement: {file_path.name}")
    if bank_type:
        print(f"Bank type override: {bank_type}")
    
    # Parse using bank-specific parser (returns tuple: df, metadata)
    df, metadata = parse_bank_statement(file_path, bank_type if bank_type else None)
    
    if df.empty:
        print("No transactions found")
        result = {
            "success": True, 
            "transactions": [], 
            "count": 0, 
            "bankType": bank_type or "UNKNOWN",
            "metadata": metadata or {}
        }
        with open(r"${jsonOutput.replace(/\\/g, '\\\\')}", 'w') as f:
            json.dump(result, f)
        print(json.dumps(result))
        return
    
    # Get detected bank type
    detected_bank = df['bankCode'].iloc[0] if 'bankCode' in df.columns and not df['bankCode'].isna().all() else None
    
    # CRITICAL: Preserve date_iso from strict parser - don't re-parse!
    # Get bank code for strict date parsing if needed
    bank_code = None
    if 'bankCode' in df.columns and not df['bankCode'].isna().all():
        bank_code = str(df['bankCode'].iloc[0]) if not df.empty else None
    
    # Only parse dates if date_iso is missing
    if 'date_iso' not in df.columns or df['date_iso'].isna().all():
        if 'date' in df.columns:
            # Use strict DD/MM/YYYY format for MAHB/SBM
            def parse_date_strict(date_val, bank_code=None):
                if pd.isna(date_val):
                    return None
                try:
                    date_str = str(date_val).strip()
                    # For MAHB/SBM/IDIB, ALWAYS use DD/MM/YYYY (never auto-detect)
                    if bank_code in ['MAHB', 'SBM', 'IDIB']:
                        parsed = pd.to_datetime(date_str, format='%d/%m/%Y', errors='coerce')
                        if pd.notna(parsed):
                            return parsed.strftime('%Y-%m-%d')
                        # Manual parsing fallback to prevent swap
                        import re
                        match = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', date_str)
                        if match:
                            day_str, month_str, year_str = match.groups()
                            from datetime import datetime
                            try:
                                dt = datetime(int(year_str), int(month_str), int(day_str))
                                return dt.strftime('%Y-%m-%d')
                            except ValueError:
                                return None
                        return None
                    # For other banks, use dayfirst=True
                    parsed = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
                    if pd.notna(parsed):
                        return parsed.strftime('%Y-%m-%d')
                    return None
                except:
                    return None
            
            df['date_iso'] = df['date'].apply(lambda x: parse_date_strict(x, bank_code=bank_code))
    
    # Normalize date_iso - preserve if already correct
    def normalize_date_iso(date_val):
        """Normalize date_iso - preserve if already in YYYY-MM-DD format"""
        if pd.isna(date_val):
            return None
        try:
            # If already in YYYY-MM-DD format (from strict parser), return as-is
            if isinstance(date_val, str) and re.match(r'^\d{4}-\d{2}-\d{2}$', date_val):
                return date_val
            # Otherwise, try to parse
            parsed = pd.to_datetime(date_val, errors='coerce')
            if pd.notna(parsed):
                return parsed.strftime('%Y-%m-%d')
            return None
        except:
            return None
    
    df['date_iso'] = df['date_iso'].apply(normalize_date_iso)
    
    # Filter out rows with invalid dates
    initial_count = len(df)
    df = df[df['date_iso'].notna()].copy()
    if len(df) < initial_count:
        print(f"Filtered out {initial_count - len(df)} transactions with invalid dates")
    
    # Convert datetime columns to strings for JSON serialization
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime('%Y-%m-%d')
    
    # Save to CSV
    try:
        df.to_csv(r"${csvOutput.replace(/\\/g, '\\\\')}", index=False)
    except Exception as e:
        print(f"Warning: Could not save CSV: {e}", file=sys.stderr)
    
    # Save to JSON
    try:
        json_records = df.to_dict(orient='records')
        result = {
            "success": True,
            "transactions": json_records,
            "count": len(json_records),
            "bankType": detected_bank or bank_type or "UNKNOWN",
            "metadata": metadata or {}
        }
        with open(r"${jsonOutput.replace(/\\/g, '\\\\')}", 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, default=str)
        
        # Print result (truncate if too large)
        result_str = json.dumps(result, ensure_ascii=False, default=str)
        if len(result_str) < 1000000:
            print(result_str)
        else:
            print(json.dumps({
                "success": True,
                "transactions": [],
                "count": len(df),
                "bankType": detected_bank or bank_type or "UNKNOWN",
                "metadata": metadata or {},
                "file": str(jsonOutput)
            }, default=str))
    except Exception as e:
        print(f"Warning: Could not save JSON: {e}", file=sys.stderr)
        print(f"SUCCESS: Extracted {len(df)} transactions.")
        print(f"CSV saved to: {csvOutput}")

if __name__ == "__main__":
    main()
`;

      const tempScriptPath = join(uploadsDir, `temp_parser_${Date.now()}.py`);
      await writeFile(tempScriptPath, tempScript);

      console.log('🏦 Parse Bank Statement API: Executing Python script');
      
      const { stdout, stderr } = await execAsync(`python "${tempScriptPath}"`, { 
        timeout: 180_000,
        maxBuffer: 10 * 1024 * 1024
      });
      
      console.log('🏦 Parse Bank Statement API: Python stdout:', stdout);
      if (stderr) {
        console.log('⚠️ Parse Bank Statement API: Python stderr:', stderr);
      }

      // Parse JSON response
      let transactions: any[] = [];
      let transactionCount = 0;
      let detectedBankType: string = 'UNKNOWN';
      let metadata: any = null;
      
      try {
        // Try parsing from stdout
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
            // Output written to file
            const { readFile } = await import('fs/promises');
            const fileContent = await readFile(jsonOutput, 'utf-8');
            const fileParsed = JSON.parse(fileContent);
            transactions = Array.isArray(fileParsed?.transactions) ? fileParsed.transactions : [];
            transactionCount = fileParsed?.count || 0;
            detectedBankType = fileParsed?.bankType || 'UNKNOWN';
            metadata = fileParsed?.metadata || null;
          } else {
            transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
            transactionCount = parsed?.count || 0;
            detectedBankType = parsed?.bankType || 'UNKNOWN';
            metadata = parsed?.metadata || null;
          }
        }
      } catch (error) {
        console.log('⚠️ Parse Bank Statement API: Failed to parse JSON from stdout', error);
      }
      
      // If stdout parsing failed, try reading JSON file
      if (transactions.length === 0 || !metadata) {
        try {
          const { readFile } = await import('fs/promises');
          const fileContent = await readFile(jsonOutput, 'utf-8');
          const parsed = JSON.parse(fileContent);
          if (transactions.length === 0) {
            transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
            transactionCount = parsed?.count || 0;
            detectedBankType = parsed?.bankType || 'UNKNOWN';
          }
          if (!metadata && parsed?.metadata) {
            metadata = parsed.metadata;
          }
          console.log(`✅ Parse Bank Statement API: Read ${transactions.length} transactions from JSON file`);
        } catch (error) {
          console.log('⚠️ Parse Bank Statement API: Failed to read JSON file', error);
        }
      }

      if (transactions.length === 0) {
        return NextResponse.json({ 
          error: 'No valid transactions found in file. Please check the format.',
          bankType: detectedBankType,
          tempFiles: [filepath, csvOutput, tempScriptPath].filter(Boolean)
        }, { status: 400 });
      }

      console.log('✅ Parse Bank Statement API: Success! Returning', transactions.length, 'transactions');
      if (metadata) {
        console.log('✅ Parse Bank Statement API: Metadata included:', {
          openingBalance: metadata.openingBalance,
          accountNumber: metadata.accountNumber,
          statementPeriod: metadata.statementStartDate && metadata.statementEndDate 
            ? `${metadata.statementStartDate} to ${metadata.statementEndDate}` 
            : 'N/A'
        });
      }
      
      return NextResponse.json({
        success: true,
        transactions,
        count: transactionCount || transactions.length,
        bankType: detectedBankType,
        metadata: metadata || undefined,
        message: `Successfully parsed ${transactions.length} transactions from ${detectedBankType} statement`,
        tempFiles: [filepath, csvOutput, tempScriptPath].filter(Boolean)
      });

    } catch (error) {
      console.error('❌ Parse Bank Statement API: Parsing error:', error);
      return NextResponse.json({ 
        error: 'Failed to parse bank statement. Please ensure it contains valid transaction data.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Parse Bank Statement API: Upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to process file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

