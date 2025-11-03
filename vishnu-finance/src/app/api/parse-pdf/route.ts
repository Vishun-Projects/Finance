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
    
    # First try bank-specific parser (supports SBIN, IDIB, KKBK, HDFC, MAHB)
    metadata = None
    try:
        import sys
        import os
        parsers_path = os.path.join(os.path.dirname(os.path.dirname(PDF_FILE)), 'tools', 'parsers')
        if parsers_path not in sys.path:
            sys.path.insert(0, parsers_path)
        from bank_detector import BankDetector
        detected_bank = BankDetector.detect_from_file(pdf_path)
        if detected_bank in ['SBIN', 'IDIB', 'KKBK', 'KKBK_V2', 'HDFC', 'MAHB']:
            # Add tools directory to path
            tools_path = os.path.join(os.path.dirname(os.path.dirname(PDF_FILE)), 'tools')
            if tools_path not in sys.path:
                sys.path.insert(0, tools_path)
            from bank_statement_parser import parse_bank_statement
            result = parse_bank_statement(pdf_path, detected_bank)
            # Handle tuple return (df, metadata)
            if isinstance(result, tuple):
                df, metadata = result
            else:
                df = result
                metadata = None
            print(f"Bank-specific parser ({detected_bank}) extracted {len(df)} transactions", file=sys.stderr)
            if not df.empty:
                # Success with bank-specific parser
                pass
            else:
                # Try accurate parser as fallback
                print(f"Bank-specific parser returned 0 transactions, trying accurate parser", file=sys.stderr)
                try:
                    from accurate_parser import parse_bank_statement_accurately
                    df_temp = parse_bank_statement_accurately(pdf_path)
                    if df_temp is not None and not df_temp.empty:
                        df = df_temp
                        metadata = None
                    print(f"Accurate parser extracted {len(df)} transactions", file=sys.stderr)
                except Exception as e:
                    print(f"Accurate parser error: {e}", file=sys.stderr)
    except Exception as e:
        print(f"Bank-specific parser error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
    
    # If still no transactions, try accurate parser
    if df is None or df.empty:
        try:
            from accurate_parser import parse_bank_statement_accurately
            df_temp = parse_bank_statement_accurately(pdf_path)
            if not df_temp.empty:
                df = df_temp
                print(f"Accurate parser extracted {len(df)} transactions", file=sys.stderr)
            elif df is None:
                df = df_temp
                print(f"Accurate parser extracted {len(df)} transactions", file=sys.stderr)
        except Exception as e:
            print(f"Accurate parser failed: {e}", file=sys.stderr)
            if df is None:
                df = pd.DataFrame()
    
    # Final fallback: try bank-specific parser without bank code
    metadata = None
    if df is None or df.empty:
        try:
            from bank_statement_parser import parse_bank_statement
            result = parse_bank_statement(pdf_path)
            # Handle tuple return (df, metadata)
            if isinstance(result, tuple):
                df, metadata = result
            else:
                df = result
                metadata = None
            print(f"Bank-specific parser (auto-detect) extracted {len(df)} transactions", file=sys.stderr)
        except Exception as e:
            print(f"Bank-specific parser fallback also failed: {e}", file=sys.stderr)
            if df is None:
                df = pd.DataFrame()
    
    if df.empty:
        result = {
            "success": True, 
            "transactions": [], 
            "count": 0,
            "metadata": metadata if metadata else {}
        }
        with open(JSON_FILE, 'w') as f:
            json.dump(result, f)
        print(json.dumps(result))
        return
    
    # Convert metadata datetime objects to ISO strings for JSON serialization
    if metadata:
        if metadata.get('statementStartDate') and hasattr(metadata['statementStartDate'], 'isoformat'):
            metadata['statementStartDate'] = metadata['statementStartDate'].isoformat()
        if metadata.get('statementEndDate') and hasattr(metadata['statementEndDate'], 'isoformat'):
            metadata['statementEndDate'] = metadata['statementEndDate'].isoformat()
    
    # Convert dates and ensure JSON-serializable - CRITICAL: Use strict DD/MM/YYYY for MAHB/SBM
    def normalize_date(date_val, bank_code=None):
        """Normalize date to ISO format (YYYY-MM-DD) with strict format enforcement"""
        if pd.isna(date_val):
            return None
        try:
            # If date_iso already exists and is valid, use it (parsed by strict parser)
            # Otherwise, parse from date column with strict format
            date_str = str(date_val).strip()
            
            # For MAHB/SBM/IDIB banks, ALWAYS use DD/MM/YYYY format (never auto-detect)
            if bank_code in ['MAHB', 'SBM', 'IDIB']:
                # Try strict DD/MM/YYYY format first
                parsed = pd.to_datetime(date_str, format='%d/%m/%Y', errors='coerce')
                if pd.notna(parsed):
                    return parsed.strftime('%Y-%m-%d')
                # If strict format failed, try manual parsing to prevent swap
                import re
                match = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', date_str)
                if match:
                    day_str, month_str, year_str = match.groups()
                    day = int(day_str)
                    month = int(month_str)
                    year = int(year_str)
                    if 1 <= month <= 12 and 1 <= day <= 31:
                        from datetime import datetime
                        try:
                            test_date = datetime(year, month, day)  # year, month, day (DD/MM/YYYY)
                            return f"{year}-{month_str}-{day_str}"
                        except ValueError:
                            return None
                return None
            
            # For other banks, use dayfirst=True to prefer DD/MM interpretation
            parsed = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
            if pd.notna(parsed):
                return parsed.strftime('%Y-%m-%d')
            
            # Fallback
            parsed = pd.to_datetime(date_str, errors='coerce')
            if pd.notna(parsed):
                return parsed.strftime('%Y-%m-%d')
            return None
        except:
            return None
    
    # Get bank code from DataFrame if available
    bank_code = None
    if 'bankCode' in df.columns and not df['bankCode'].isna().all():
        bank_code = str(df['bankCode'].iloc[0]) if not df.empty else None
    
    # CRITICAL: If date_iso already exists (from strict parser), use it - don't re-parse!
    # Only normalize if date_iso is missing or invalid
    if 'date_iso' in df.columns:
        # Check if date_iso is already valid
        valid_date_iso = df['date_iso'].notna()
        if valid_date_iso.sum() == len(df):
            # All dates already parsed correctly by strict parser - use them as-is
            pass
        else:
            # Some dates missing - fill from date column with strict parsing
            missing_mask = df['date_iso'].isna()
            if missing_mask.any() and 'date' in df.columns:
                df.loc[missing_mask, 'date_iso'] = df.loc[missing_mask, 'date'].apply(
                    lambda x: normalize_date(x, bank_code=bank_code)
                )
    elif 'date' in df.columns:
        # No date_iso column - create from date with strict parsing
        df["date_iso"] = df["date"].apply(lambda x: normalize_date(x, bank_code=bank_code))
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
        result = {
            "success": True, 
            "transactions": json.loads(json_records), 
            "count": int(len(df)),
            "metadata": metadata if metadata else {}
        }
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)
        # Also print to stdout for compatibility, but truncate if too large
        result_str = json.dumps(result, ensure_ascii=False)
        if len(result_str) < 1000000:  # Only print if under 1MB
            print(result_str)
        else:
            print(json.dumps({
                "success": True, 
                "transactions": [], 
                "count": len(df), 
                "metadata": metadata if metadata else {},
                "file": JSON_FILE
            }))
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
        result = {
            "success": True, 
            "transactions": records, 
            "count": len(records),
            "metadata": metadata if metadata else {}
        }
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
      
      // Use increased maxBuffer (10MB) and timeout (180s) to handle large PDF outputs
      const { stdout, stderr } = await execAsync(`python "${tempScriptPath}"`, { 
        timeout: 180_000,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      console.log('🔍 PDF API: Python stdout:', stdout);
      if (stderr) console.log('⚠️ PDF API: Python stderr:', stderr);
      
      // Keep temporary script for later cleanup
      console.log('📁 PDF API: Temporary script will be cleaned up after import');

      // Parse JSON - first try stdout, then fallback to JSON file, then CSV file
      let transactions: any[] = [];
      let transactionCount = 0;
      
      let metadata: any = null;
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
            metadata = fileParsed?.metadata || null;
          } else {
            transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
            transactionCount = parsed?.count || 0;
            metadata = parsed?.metadata || null;
          }
        }
      } catch (error) {
        console.log('⚠️ PDF API: Failed to parse stdout, trying JSON file...');
      }
      
      // If stdout parsing failed or returned empty, try reading from JSON file
      if (transactions.length === 0 || !metadata) {
        try {
          const fileContent = await readFile(jsonOutput, 'utf-8');
          const parsed = JSON.parse(fileContent);
          if (transactions.length === 0) {
            transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
            transactionCount = parsed?.count || 0;
          }
          if (!metadata && parsed?.metadata) {
            metadata = parsed.metadata;
          }
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
      if (metadata) {
        console.log('✅ PDF API: Metadata included:', {
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
        count: transactions.length,
        metadata: metadata || undefined,
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
