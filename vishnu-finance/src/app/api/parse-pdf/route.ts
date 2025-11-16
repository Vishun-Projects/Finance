import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';

// Dynamic import for Node.js parser fallback
const parsePDFWithNode = async (filePath: string, bankHint?: string) => {
  try {
    const { parsePDFWithNode: parser } = await import('@/lib/parsers/node-pdf-parser');
    return await parser(filePath, bankHint);
  } catch (error) {
    console.error('Failed to load Node.js parser:', error);
    return { success: false, transactions: [], count: 0, metadata: {} };
  }
};

const execAsync = promisify(exec);

/**
 * Try to call Python serverless function for PDF parsing
 */
async function tryPythonParser(pdfBuffer: Buffer, bankHint: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Determine base URL for Python function
    // In Vercel production, use VERCEL_URL
    // In local development, use localhost
    let baseUrl: string;
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.VERCEL) {
      // Vercel preview deployments
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      // Local development
      baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    }
    
    const pythonFunctionUrl = `${baseUrl}/api/parser`;
    
    // Convert buffer to base64
    const pdfBase64 = pdfBuffer.toString('base64');
    
    const response = await fetch(pythonFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'pdf',
        payload: {
          pdf_data: pdfBase64,
          bank: bankHint,
        }
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.error(`❌ PDF API: Python function returned error status ${response.status}:`, errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ PDF API: Python function call failed, will try fallback:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function POST(request: NextRequest) {
  console.log('🔍 PDF API: Starting request processing');
  
  
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    const bankHint = (formData.get('bank') as string | null)?.toLowerCase() || '';
    
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

    // Use /tmp directory for serverless environments (Vercel, AWS Lambda, etc.)
    // /tmp is the only writable directory in serverless functions
    const uploadsDir = join(tmpdir(), 'pdf-uploads');
    const toolsDir = join(process.cwd(), 'tools');
    const toolsMasterDir = join(process.cwd(), 'tools-master');
    const legacyToolsDir = join(process.cwd(), 'legacy', 'tools');
    
    // Ensure uploads directory exists
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch {
      // Directory might already exist, ignore error
    }
    
    console.log('🔍 PDF API: Directories:', { uploadsDir, toolsDir });
    
    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `statement_${Date.now()}.pdf`;
    const filepath = join(uploadsDir, filename);
    
    console.log('🔍 PDF API: Saving file to:', filepath);
    await writeFile(filepath, buffer);
    console.log('✅ PDF API: File saved successfully');

    // Strategy 1: Try Python serverless function first (production)
    try {
      console.log('🐍 PDF API: Attempting Python serverless function...');
      const pythonResult = await tryPythonParser(buffer, bankHint);
      
      if (pythonResult.success && pythonResult.data) {
        console.log('✅ PDF API: Python parser succeeded');
        const result = pythonResult.data;
        
        // Clean up file
        try {
          await unlink(filepath);
        } catch {}
        
        return NextResponse.json({
          success: result.success || true,
          transactions: result.transactions || [],
          count: result.count || 0,
          metadata: result.metadata || {},
        });
      } else {
        console.log('⚠️ PDF API: Python parser failed, trying local Python execution...');
      }
    } catch (error) {
      console.log('⚠️ PDF API: Python function error, trying fallback:', error);
    }

    // Strategy 2: Try local Python execution (development/local)
    try {
      // Update the Python script to use the uploaded file
      const csvOutput = join(uploadsDir, `extracted_${Date.now()}.csv`);
      const jsonOutput = join(uploadsDir, `extracted_${Date.now()}.json`);
      
      // Create a temporary Python script that writes output to file instead of stdout
      const tempScript = `
import sys
import os
sys.path.append(r'${toolsDir.replace(/\\/g, '\\\\')}')
sys.path.insert(0, r'${toolsMasterDir.replace(/\\/g, '\\\\')}')
sys.path.insert(0, r'${legacyToolsDir.replace(/\\/g, '\\\\')}')

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

    # Try unified master parser first
    try:
        from master_parser import parse as master_parse
        parsed = master_parse(pdf_path, BANK_HINT)
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(parsed, f, ensure_ascii=False, default=str)
        print(json.dumps(parsed, ensure_ascii=False, default=str))
        return
    except Exception as master_err:
        print(f"Master parser unavailable, falling back to legacy: {master_err}", file=sys.stderr)

    df = None
    
    # First try bank-specific parser (supports SBIN, IDIB, KKBK, HDFC, MAHB)
    metadata = None
    detected_bank = None
    try:
        import sys
        import os
        parsers_path = os.path.join(os.path.dirname(os.path.dirname(PDF_FILE)), 'tools', 'parsers')
        if parsers_path not in sys.path:
            sys.path.insert(0, parsers_path)
        from bank_detector import BankDetector
        detected_bank = BankDetector.detect_from_file(pdf_path)
        print(f"Detected bank: {detected_bank}", file=sys.stderr)
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
            if metadata:
                print(f"Metadata extracted: openingBalance={metadata.get('openingBalance')}, accountNumber={metadata.get('accountNumber')}", file=sys.stderr)
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
                        # Try to extract metadata even if parser didn't return it
                        if not metadata:
                            try:
                                from parsers.statement_metadata import StatementMetadataExtractor
                                metadata = StatementMetadataExtractor.extract_all_metadata(pdf_path, detected_bank or 'UNKNOWN', df)
                            except Exception as meta_err:
                                print(f"Metadata extraction error: {meta_err}", file=sys.stderr)
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
            # Try to extract metadata
            if not metadata and df is not None and not df.empty:
                try:
                    from parsers.statement_metadata import StatementMetadataExtractor
                    metadata = StatementMetadataExtractor.extract_all_metadata(pdf_path, detected_bank or 'UNKNOWN', df)
                except Exception as meta_err:
                    print(f"Metadata extraction error: {meta_err}", file=sys.stderr)
        except Exception as e:
            print(f"Accurate parser failed: {e}", file=sys.stderr)
            if df is None:
                df = pd.DataFrame()
    
    # Final fallback: try bank-specific parser without bank code
    if df is None or df.empty:
        try:
            from bank_statement_parser import parse_bank_statement
            result = parse_bank_statement(pdf_path)
            # Handle tuple return (df, metadata)
            if isinstance(result, tuple):
                df, metadata = result
            else:
                df = result
                # Try to extract metadata if not already extracted
                if not metadata and df is not None and not df.empty:
                    try:
                        from parsers.statement_metadata import StatementMetadataExtractor
                        metadata = StatementMetadataExtractor.extract_all_metadata(pdf_path, detected_bank or 'UNKNOWN', df)
                    except Exception as meta_err:
                        print(f"Metadata extraction error: {meta_err}", file=sys.stderr)
            print(f"Bank-specific parser (auto-detect) extracted {len(df)} transactions", file=sys.stderr)
        except Exception as e:
            print(f"Bank-specific parser fallback also failed: {e}", file=sys.stderr)
            if df is None:
                df = pd.DataFrame()
    
    # Ensure metadata is always a dict (even if empty) for consistent JSON output
    if metadata is None:
        metadata = {}
    elif not isinstance(metadata, dict):
        metadata = {}
    
    # If no transactions found, still return metadata if available
    if df.empty:
        result = {
            "success": True, 
            "transactions": [], 
            "count": 0,
            "metadata": metadata
        }
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)
        print(json.dumps(result, ensure_ascii=False))
        return
    
    # Convert metadata datetime objects to ISO strings for JSON serialization
    # Ensure metadata is always a dict
    if not metadata:
        metadata = {}
    
    if metadata:
        if metadata.get('statementStartDate') and hasattr(metadata['statementStartDate'], 'isoformat'):
            metadata['statementStartDate'] = metadata['statementStartDate'].isoformat()
        elif metadata.get('statementStartDate'):
            # Already a string, keep as is
            pass
        if metadata.get('statementEndDate') and hasattr(metadata['statementEndDate'], 'isoformat'):
            metadata['statementEndDate'] = metadata['statementEndDate'].isoformat()
        elif metadata.get('statementEndDate'):
            # Already a string, keep as is
            pass
    
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
            "metadata": metadata  # Always include metadata (even if empty dict)
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
                "metadata": metadata,  # Always include metadata
                "file": JSON_FILE
            }, ensure_ascii=False))
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
            "metadata": metadata  # Always include metadata (even if empty dict)
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

      // Parse JSON - always read from JSON file (more reliable than stdout)
      let transactions: any[] = [];
      let transactionCount = 0;
      let metadata: any = null;
      
      // Always read from JSON file first (most reliable)
      try {
        const fileContent = await readFile(jsonOutput, 'utf-8');
        const parsed = JSON.parse(fileContent);
        transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
        transactionCount = parsed?.count || 0;
        metadata = parsed?.metadata || null;
        console.log(`✅ PDF API: Read ${transactions.length} transactions from JSON file`);
        if (metadata) {
          console.log('✅ PDF API: Metadata extracted:', {
            hasOpeningBalance: metadata.openingBalance !== null && metadata.openingBalance !== undefined,
            hasClosingBalance: metadata.closingBalance !== null && metadata.closingBalance !== undefined,
            hasAccountNumber: !!metadata.accountNumber,
            hasIFSC: !!metadata.ifsc,
            hasBranch: !!metadata.branch,
            hasAccountHolder: !!metadata.accountHolderName,
            hasStatementDates: !!(metadata.statementStartDate && metadata.statementEndDate),
          });
        } else {
          console.log('⚠️ PDF API: No metadata found in JSON file');
        }
      } catch (error) {
        console.log('⚠️ PDF API: Failed to read JSON file, trying stdout...', error);
        
        // Fallback: Try parsing stdout (but be more careful)
        try {
          const trimmed = stdout.trim();
          // Find JSON object in stdout - look for complete JSON structure
          const jsonMatch = trimmed.match(/\{[\s\S]*"transactions"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.file) {
              // Output indicates JSON was written to file, try reading it again
              try {
                const fileContent = await readFile(jsonOutput, 'utf-8');
                const fileParsed = JSON.parse(fileContent);
                transactions = Array.isArray(fileParsed?.transactions) ? fileParsed.transactions : [];
                transactionCount = fileParsed?.count || 0;
                metadata = fileParsed?.metadata || null;
              } catch {
                console.log('⚠️ PDF API: Failed to read JSON file after stdout indicated file path');
              }
            } else {
              transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
              transactionCount = parsed?.count || 0;
              metadata = parsed?.metadata || null;
            }
          }
        } catch {
          console.log('⚠️ PDF API: Failed to parse stdout as well');
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
          tempFiles: [filepath, csvOutput, tempScriptPath].filter(Boolean),
          debug: {
            method: 'local_python',
            inputs: { bankHint, filename },
            files: { filepath, csvOutput, tempScriptPath },
            stdoutSnippet: (stdout || '').slice(0, 2000),
            stderrSnippet: (stderr || '').slice(0, 2000)
          }
        });
      }

      // Keep files for cleanup after successful import
      console.log('📁 PDF API: Keeping files for import:', { filepath, csvOutput, tempScriptPath });

      console.log('✅ PDF API: Success! Returning', transactions.length, 'transactions');
      
      // Always include metadata (even if empty) - ensure it's an object
      const finalMetadata = metadata && typeof metadata === 'object' ? metadata : {};
      
      if (finalMetadata && Object.keys(finalMetadata).length > 0) {
        console.log('✅ PDF API: Metadata included:', {
          openingBalance: finalMetadata.openingBalance,
          closingBalance: finalMetadata.closingBalance,
          accountNumber: finalMetadata.accountNumber,
          ifsc: finalMetadata.ifsc,
          branch: finalMetadata.branch,
          accountHolderName: finalMetadata.accountHolderName,
          statementPeriod: finalMetadata.statementStartDate && finalMetadata.statementEndDate 
            ? `${finalMetadata.statementStartDate} to ${finalMetadata.statementEndDate}` 
            : 'N/A',
          totalCredits: finalMetadata.totalCredits,
          totalDebits: finalMetadata.totalDebits,
          transactionCount: finalMetadata.transactionCount,
        });
      } else {
        console.log('⚠️ PDF API: No metadata extracted from PDF');
      }
      
      return NextResponse.json({ 
        success: true, 
        transactions, 
        count: transactionCount || transactions.length,
        metadata: finalMetadata,  // Always include metadata (even if empty)
        tempFiles: [filepath, csvOutput, tempScriptPath].filter(Boolean),
        debug: {
          method: 'local_python',
          inputs: { bankHint, filename },
          files: { filepath, csvOutput, tempScriptPath },
          stdoutSnippet: (stdout || '').slice(0, 2000),
          stderrSnippet: (stderr || '').slice(0, 2000),
          codeFiles: [
            'tools-master/master_parser.py',
            'tools-master/extractors/generic.py',
            'legacy/tools/accurate_parser.py',
            'legacy/tools/bank_statement_parser.py'
          ],
          explanation: 'Parsed via unified master parser (compat mode), with normalization and legacy fallbacks.'
        }
      });

    } catch (error) {
      console.error('❌ PDF API: Local Python execution failed:', error);
      
      // Strategy 3: Fallback to Node.js parser
      try {
        console.log('📄 PDF API: Attempting Node.js fallback parser...');
        const nodeResult = await parsePDFWithNode(filepath, bankHint);
        
        if (nodeResult.success && nodeResult.transactions.length > 0) {
          console.log(`✅ PDF API: Node.js parser succeeded with ${nodeResult.transactions.length} transactions`);
          
          // Clean up file
          try {
            await unlink(filepath);
          } catch {}
          
          return NextResponse.json({
            success: true,
            transactions: nodeResult.transactions,
            count: nodeResult.count,
            metadata: nodeResult.metadata || {},
            warning: 'Parsed using fallback parser. Results may be less accurate than Python parser.',
            debug: {
              method: 'node_fallback',
              inputs: { bankHint, filename },
              codeFiles: ['src/lib/parsers/node-pdf-parser.ts'],
              explanation: 'Used Node.js fallback parser due to Python failure. Extracted transactions using Node parser utilities.'
            }
          });
        } else {
          console.log('⚠️ PDF API: Node.js parser found no transactions');
        }
      } catch (nodeError) {
        console.error('❌ PDF API: Node.js parser also failed:', nodeError);
      }
      
      // Clean up files on error
      try {
        await unlink(filepath);
      } catch {}
      
      console.error('❌ PDF API: All parsing methods failed');
      return NextResponse.json({ 
        error: 'Failed to parse PDF. Please ensure it\'s a valid bank statement. All parsing methods (Python serverless, local Python, and Node.js fallback) failed.',
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          methodTried: ['serverless_python', 'local_python', 'node_fallback'],
          inputs: { bankHint, filename }
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ PDF API: PDF upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to process PDF',
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: { stage: 'upload', error: error instanceof Error ? error.message : 'Unknown error' }
    }, { status: 500 });
  }
}
