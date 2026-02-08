import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
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
async function tryPythonParser(pdfBuffer: Buffer, bankHint: string, bankParserConfigs: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
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

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // internal-request-bypass for Vercel
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    }

    const response = await fetch(pythonFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'pdf',
        args: {
          pdf_data: pdfBase64,
          bank_hint: bankHint,
          output_format: "json",
          bank_profiles: bankParserConfigs
        }
      }),
    });

    if (response.ok) {
      const data = await response.json();
      // Python serverless functions may return {statusCode, body} format
      // or direct JSON response
      if (data.statusCode && data.body) {
        try {
          const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
          if (data.statusCode === 200) {
            return { success: true, data: parsedBody };
          } else {
            return { success: false, error: parsedBody.error || 'Python parser failed' };
          }
        } catch (_e) {
          return { success: false, error: data.body || 'Failed to parse Python response' };
        }
      }
      return { success: true, data };
    } else {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        // Not JSON, use as-is
      }
      console.error(`❌ PDF API: Python function returned error status ${response.status}:`, errorMessage);
      return { success: false, error: errorMessage };
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
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6a07c0bd-f817-41ee-a7bf-a7a39cb5dabd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'parse-pdf/route.ts:100', message: 'POST handler called', data: { url: request.url, method: request.method }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
  // #endregion
  console.log('🔍 PDF API: Starting request processing');


  try {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6a07c0bd-f817-41ee-a7bf-a7a39cb5dabd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'parse-pdf/route.ts:105', message: 'Before formData parsing', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion
    const formData = await request.formData();
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6a07c0bd-f817-41ee-a7bf-a7a39cb5dabd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'parse-pdf/route.ts:107', message: 'After formData parsing', data: { hasFormData: !!formData }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion
    const file = formData.get('file') as File;
    const password = (formData.get('password') as string | null) || '';

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6a07c0bd-f817-41ee-a7bf-a7a39cb5dabd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'parse-pdf/route.ts:110', message: 'File extracted from formData', data: { hasFile: !!file, fileName: file?.name, fileType: file?.type, fileSize: file?.size, bankHint: (formData.get('bank') as string | null)?.toLowerCase() || '' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion

    // 0. Preparation
    const bankHint = (formData.get('bankCode') as string || null)?.toLowerCase() || '';
    console.log('🔍 PDF API: Starting request processing', { bankHint });

    // Fetch Bank Configurations from DB
    let bankParserConfigs: any[] = [];
    try {
      bankParserConfigs = await (prisma as any).bankParserConfig.findMany({
        where: { isActive: true },
        select: {
          bankCode: true,
          bankName: true,
          detectionKeywords: true,
          headerKeywords: true,
          columns: true,
          parserType: true
        }
      });
      console.log(`🔍 PDF API: Loaded ${bankParserConfigs.length} bank parser configs from DB`);
    } catch (dbErr) {
      console.warn('⚠️ PDF API: Failed to load bank configs from DB, using defaults', dbErr);
    }

    console.log('🔍 PDF API: Form data received');
    console.log('🔍 PDF API: File details:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      hasPassword: !!password
    });

    if (!file) {
      // ... (no changes) ...
    }

    // Allow PDF, Excel, and Text files
    const validTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];

    // Optional: stricter mime check if needed, but client check + extension check later is usually enough
    // if (!validTypes.includes(file.type)) { ... }

    // Use /tmp directory for serverless environments (Vercel, AWS Lambda, etc.)
    // /tmp is the only writable directory in serverless functions
    const uploadsDir = join(tmpdir(), 'pdf-uploads');

    // Determine the correct path for Python tools
    // In production/Vercel, path might be different, but for local:
    // It seems tools are in 'api/parse-pdf-python' based on file search
    const toolsDir = join(process.cwd(), 'api', 'parse-pdf-python');
    const toolsMasterDir = join(process.cwd(), 'tools-master'); // Keep this if valid, or update
    const legacyToolsDir = join(process.cwd(), 'legacy', 'tools'); // Keep this if valid

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

    // Determine extension from original filename
    const originalName = file.name || 'document.pdf';
    const ext = originalName.substring(originalName.lastIndexOf('.'));
    const filename = `statement_${Date.now()}${ext}`;
    const filepath = join(uploadsDir, filename);

    console.log('🔍 PDF API: Saving file to:', filepath);
    await writeFile(filepath, buffer);
    console.log('✅ PDF API: File saved successfully');

    // Upload to Supabase Storage (bank-statements bucket)
    // We upload even for local dev to ensure consistent storage migration
    let remoteFilePath = '';
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bank-statements')
          .upload(filename, buffer, {
            contentType: file.type,
            upsert: false
          });

        if (!uploadError && uploadData) {
          remoteFilePath = uploadData.path;
          console.log('✅ PDF API: Uploaded to Supabase:', remoteFilePath);
        } else {
          console.warn('⚠️ PDF API: Supabase upload failed:', uploadError);
        }
      }
    } catch (supaError) {
      console.warn('⚠️ PDF API: Supabase upload error:', supaError);
    }

    // Strategy 1: Try Python serverless function first (production)
    // Skip in local development if VERCEL_URL is not set
    const isProduction = !!process.env.VERCEL_URL || !!process.env.VERCEL;
    if (isProduction) {
      try {
        console.log('🐍 PDF API: Attempting Python serverless function...');
        const pythonResult = await tryPythonParser(buffer, bankHint, bankParserConfigs);

        if (pythonResult.success && pythonResult.data) {
          console.log('✅ PDF API: Python parser succeeded');
          const result = pythonResult.data;

          // Clean up file
          try {
            await unlink(filepath);
          } catch { }

          if (result.status === 'needs_password') {
            return NextResponse.json({
              success: false,
              status: 'needs_password',
              error: 'Password required'
            }, { status: 401 });
          }

          return NextResponse.json({
            success: result.success || true,
            transactions: result.transactions || [],
            count: result.count || 0,
            metadata: result.metadata || {},
            remoteFile: remoteFilePath,
          });
        } else {
          console.log('⚠️ PDF API: Python serverless parser failed:', pythonResult.error);
          console.log('⚠️ PDF API: Trying local Python execution...');
        }
      } catch (error) {
        console.log('⚠️ PDF API: Python serverless function error, trying fallback:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message, error.stack);
        }
      }
    } else {
      console.log('ℹ️ PDF API: Local development mode - skipping Python serverless function');
    }

    // Strategy 2: Try local Python execution (development/local)
    console.log('🐍 PDF API: Starting local Python execution...');
    console.log('📁 PDF API: File path:', filepath);
    console.log('📁 PDF API: Tools directory:', toolsDir);

    try {
      // Check if Python is available
      try {
        const { stdout: pythonVersion } = await execAsync('python --version');
        console.log('✅ PDF API: Python found:', pythonVersion.trim());
      } catch (_pythonCheckError) {
        console.error('❌ PDF API: Python not found in PATH. Please ensure Python is installed.');
        throw new Error('Python is not available. Please install Python to use the PDF parser.');
      }

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
PASSWORD = r"${password}" if "${password}" else None
CSV_FILE = r"${csvOutput.replace(/\\/g, '\\\\')}"
JSON_FILE = r"${jsonOutput.replace(/\\/g, '\\\\')}"
BANK_PROFILES = ${JSON.stringify(bankParserConfigs)}
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
        # Check if master parser actually did anything or just returned empty
        # Assuming master parser structure... but let's be safe and let pipeline run too if needed?
        # For now, if master parser works, we trust it. 
        # But we want to ensure password usage? 
        # master_parser.parse signature might NOT support password yet?
        # If master_parser fails on password, it throws, so we fall back.
        
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(parsed, f, ensure_ascii=False, default=str)
        print(json.dumps(parsed, ensure_ascii=False, default=str))
        return
    except Exception as master_err:
        print(f"Master parser unavailable, falling back to legacy: {master_err}", file=sys.stderr)

    df = None
    metadata = None
    
    # Try 14-Stage Pipeline via bank_statement_parser
    try:
        parsers_path = os.path.join(r'${toolsDir.replace(/\\/g, '\\\\')}', 'parsers')
        if parsers_path not in sys.path:
            sys.path.insert(0, parsers_path)
            
        from bank_statement_parser import parse_bank_statement
        
        # Call with password and bank profiles
        result = parse_bank_statement(pdf_path, BANK_HINT, PASSWORD, BANK_PROFILES)
        
        # Handle tuple return (df, metadata)
        if isinstance(result, tuple):
            df, metadata = result
        else:
            df = result
            metadata = None
            
        if not df.empty:
             print(f"Pipeline extraction successful: {len(df)} transactions", file=sys.stderr)
             
    except Exception as e:
        print(f"Pipeline error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
    
    # If still no transactions, try accurate parser (legacy fallback)
    if df is None or df.empty:
        try:
            from accurate_parser import parse_bank_statement_accurately
            # Note: accurate_parser usually doesn't take password? Defaulting to no password.
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
                    metadata = StatementMetadataExtractor.extract_all_metadata(pdf_path, BANK_HINT or 'UNKNOWN', df)
                except Exception as meta_err:
                    print(f"Metadata extraction error: {meta_err}", file=sys.stderr)
        except Exception as e:
            print(f"Accurate parser failed: {e}", file=sys.stderr)
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
    if metadata:
        if metadata.get('statementStartDate') and hasattr(metadata['statementStartDate'], 'isoformat'):
            metadata['statementStartDate'] = metadata['statementStartDate'].isoformat()
        elif metadata.get('statementStartDate'):
            pass
        if metadata.get('statementEndDate') and hasattr(metadata['statementEndDate'], 'isoformat'):
            metadata['statementEndDate'] = metadata['statementEndDate'].isoformat()
        elif metadata.get('statementEndDate'):
            pass
    
    # Convert dates to ISO
    def normalize_date(date_val, bank_code=None):
        if pd.isna(date_val): return None
        try:
            return pd.to_datetime(str(date_val).strip(), dayfirst=True, errors='coerce').strftime('%Y-%m-%d')
        except: return None
        
    bank_code = None
    if 'bankCode' in df.columns and not df['bankCode'].isna().all():
        bank_code = str(df['bankCode'].iloc[0]) if not df.empty else None

    if 'date_iso' not in df.columns:
        if 'date' in df.columns:
             df["date_iso"] = df["date"].apply(lambda x: normalize_date(x, bank_code))
        else:
             df["date_iso"] = None

    df = df[df["date_iso"].notna()].copy()

    # Best-effort stringify
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime('%Y-%m-%d')
            
    # Write JSON
    try:
        json_records = df.to_json(orient='records')
        result = {
            "success": True, 
            "transactions": json.loads(json_records), 
            "count": int(len(df)),
            "metadata": metadata
        }
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)
        result_str = json.dumps(result, ensure_ascii=False)
        if len(result_str) < 1000000:
            print(result_str)
        else:
            print(json.dumps({"success": True, "file": JSON_FILE, "transactions": [], "metadata": metadata}, ensure_ascii=False))
    except Exception as e:
        print(f"JSON serialization error: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
`;

      const tempScriptPath = join(uploadsDir, `temp_parser_${Date.now()}.py`);
      await writeFile(tempScriptPath, tempScript);

      // Execute the Python script
      console.log('🔍 PDF API: Executing Python script:', tempScriptPath);
      console.log('🔍 PDF API: Python command:', `python "${tempScriptPath}"`);
      console.log('🔍 PDF API: Input file exists:', existsSync(filepath));

      // Use increased maxBuffer (10MB) and timeout (180s) to handle large PDF outputs
      let stdout = '';
      let stderr = '';
      try {
        const result = await execAsync(`python "${tempScriptPath}"`, {
          timeout: 180_000,
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
        stdout = result.stdout || '';
        stderr = result.stderr || '';
      } catch (execError: any) {
        stdout = execError.stdout || '';
        stderr = execError.stderr || '';
        console.error('❌ PDF API: Python execution error:', execError.message);
        if (execError.code) {
          console.error('❌ PDF API: Exit code:', execError.code);
        }
        // Don't throw yet - try to parse output if available
      }

      console.log('🔍 PDF API: Python stdout length:', stdout.length);
      console.log('🔍 PDF API: Python stdout (first 500 chars):', stdout.substring(0, 500));
      if (stderr) {
        console.log('⚠️ PDF API: Python stderr length:', stderr.length);
        console.log('⚠️ PDF API: Python stderr:', stderr);
      }

      // Keep temporary script for later cleanup
      console.log('📁 PDF API: Temporary script will be cleaned up after import');

      // ---------------------------------------------------------
      // UNIFIED RESULT PARSING
      // ---------------------------------------------------------

      let transactions: any[] = [];
      let transactionCount = 0;
      let metadata: any = {};
      let debugLogs = stderr; // Capture stderr for debug_logs
      let parseSuccess = false;
      let finalResult: any = null;

      // 1. Try reading the JSON output file (Preferred)
      try {
        const jsonContent = await readFile(jsonOutput, 'utf-8');
        finalResult = JSON.parse(jsonContent);
        transactions = Array.isArray(finalResult?.transactions) ? finalResult.transactions : [];
        transactionCount = finalResult?.count || 0;
        metadata = finalResult?.metadata || {};
        debugLogs = finalResult?.debug_logs || debugLogs;
        parseSuccess = true;
        console.log(`✅ PDF API: Read ${transactions.length} transactions from JSON file`);
      } catch (fileError) {
        console.warn('⚠️ PDF API: JSON file empty or missing, trying stdout...');
      }

      // 2. Fallback: Parse stdout if file failed
      if (!parseSuccess) {
        try {
          // Find the last line that looks like JSON
          const lines = stdout.trim().split('\n');
          // Try last few lines in reverse
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('{') && line.endsWith('}')) {
              const parsed = JSON.parse(line);
              // Check if it looks like our result object
              if (parsed.success !== undefined || parsed.transactions !== undefined) {
                transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
                transactionCount = parsed?.count || 0;
                metadata = parsed?.metadata || {};
                parseSuccess = true;
                break;
              }
            }
          }
        } catch (e) {
          console.error('❌ PDF API: Failed to parse Python stdout.');
        }
      }

      // 3. Fallback: CSV (if CSV exists and JSON failed)
      if (!parseSuccess && !transactions.length) {
        try {
          const csvContent = await import('fs').then(fs => fs.promises.readFile(csvOutput, 'utf-8'));
          const lines = csvContent.split('\n').filter(line => line.trim());
          if (lines.length >= 2) {
            const headers = lines[0].split(',').map(h => h.trim());
            const rows = [];
            for (let i = 1; i < lines.length; i++) {
              const vals = lines[i].split(',').map(v => v.trim());
              const row: any = {};
              headers.forEach((h, idx) => row[h] = vals[idx] || '');
              rows.push(row);
            }
            transactions = rows;
            transactionCount = rows.length;
            console.log(`✅ PDF API: Recovered ${transactions.length} transactions from CSV`);
          }
        } catch (csvError) {
          // CSV missing too
        }
      }

      // Ensure metadata is valid object
      const finalMetadata = metadata && typeof metadata === 'object' ? metadata : {};

      // 4. Construct Final Response
      if (!transactions.length) {
        // Return success=true but with empty data + DEBUG LOGS
        return NextResponse.json({
          success: true,
          transactions: [],
          count: 0,
          metadata: finalMetadata,
          tempFiles: [filepath, csvOutput, tempScriptPath].filter(Boolean),
          debug_logs: debugLogs,
          debug: {
            method: 'local_python',
            inputs: { bankHint, filename },
            files: { filepath, csvOutput, tempScriptPath },
            stdoutSnippet: (stdout || '').slice(0, 2000),
            stderrSnippet: (stderr || '').slice(0, 2000)
          }
        });
      }

      console.log('✅ PDF API: Success! Returning', transactions.length, 'transactions');

      if (finalResult && finalResult.status === 'needs_password') {
        return NextResponse.json({
          success: false,
          status: 'needs_password',
          error: 'Password required'
        }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        transactions: transactions,
        count: transactionCount,
        metadata: finalMetadata,
        remoteFile: remoteFilePath,
        debug_logs: debugLogs
      });
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/6a07c0bd-f817-41ee-a7bf-a7a39cb5dabd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'parse-pdf/route.ts:683', message: 'Top-level catch block', data: { errorMessage: error instanceof Error ? error.message : 'unknown', errorStack: error instanceof Error ? error.stack : undefined }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      console.error('❌ PDF API: PDF upload error:', error);
      return NextResponse.json({
        error: 'Failed to process PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: { stage: 'upload', error: error instanceof Error ? error.message : 'Unknown error' }
      }, { status: 500 });
    }
  } catch (e) {
    console.error('Fatal API Error:', e);
    return NextResponse.json({ error: 'Fatal Error' }, { status: 500 });
  }
}
