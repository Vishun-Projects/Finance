import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

/**
 * Try to call Python serverless function for multi-format file parsing
 */
async function tryPythonParser(fileBuffer: Buffer, fileType: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Determine base URL for Python function
    let baseUrl: string;
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.VERCEL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    }
    
    const pythonFunctionUrl = `${baseUrl}/api/parser`;
    
    const fileBase64 = fileBuffer.toString('base64');
    
    const response = await fetch(pythonFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'file',
        payload: {
          file_data: fileBase64,
          file_type: fileType,
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
        } catch (e) {
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
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.log('⚠️ Multi-Format API: Python function call failed, will try fallback:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function POST(request: NextRequest) {
  console.log('🔍 Multi-Format API: Starting request processing');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    console.log('🔍 Multi-Format API: Form data received');
    console.log('🔍 Multi-Format API: File details:', {
      name: file?.name,
      type: file?.type,
      size: file?.size
    });
    
    if (!file) {
      console.log('❌ Multi-Format API: No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Determine file type by extension (more reliable than MIME type)
    const fileName = file.name.toLowerCase();
    let fileType = null;
    
    if (fileName.endsWith('.pdf')) fileType = '.pdf';
    else if (fileName.endsWith('.xls')) fileType = '.xls';
    else if (fileName.endsWith('.xlsx')) fileType = '.xlsx';
    else if (fileName.endsWith('.doc')) fileType = '.doc';
    else if (fileName.endsWith('.docx')) fileType = '.docx';
    else if (fileName.endsWith('.txt')) fileType = '.txt';
    
    if (!fileType) {
      console.log('❌ Multi-Format API: Unsupported file type:', file.name);
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload PDF, XLS, XLSX, DOC, DOCX, or TXT files.' 
      }, { status: 400 });
    }

    // Use /tmp directory for serverless environments (Vercel, AWS Lambda, etc.)
    // /tmp is the only writable directory in serverless functions
    const uploadsDir = join(tmpdir(), 'multi-format-uploads');
    const toolsDir = join(process.cwd(), 'tools');
    const parseFilePythonDir = join(process.cwd(), 'api', 'parse-file-python');
    const legacyToolsDir = join(process.cwd(), 'legacy', 'tools');
    
    // Ensure uploads directory exists
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch {
      // Directory might already exist, ignore error
    }
    
    console.log('🔍 Multi-Format API: Directories:', { uploadsDir, toolsDir });
    
    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `statement_${Date.now()}${fileType}`;
    const filepath = join(uploadsDir, filename);
    
    console.log('🔍 Multi-Format API: Saving file to:', filepath);
    await writeFile(filepath, buffer);
    console.log('✅ Multi-Format API: File saved successfully');

    // Strategy 1: Try Python serverless function first (production)
    // Skip in local development if VERCEL_URL is not set
    const isProduction = !!process.env.VERCEL_URL || !!process.env.VERCEL;
    if (isProduction) {
      try {
        console.log('🐍 Multi-Format API: Attempting Python serverless function...');
        const pythonResult = await tryPythonParser(buffer, fileType);
        
        if (pythonResult.success && pythonResult.data) {
          console.log('✅ Multi-Format API: Python parser succeeded');
          const result = pythonResult.data;
          
          // Clean up file
          try {
            await unlink(filepath);
          } catch {}
          
          return NextResponse.json({
            success: result.success || true,
            transactions: result.transactions || [],
            count: result.count || 0,
            fileType: result.fileType || fileType.toUpperCase().replace('.', ''),
            message: result.message || `Successfully parsed ${result.count || 0} transactions from ${fileType.toUpperCase()} file`,
          });
        } else {
          console.log('⚠️ Multi-Format API: Python serverless parser failed:', pythonResult.error);
          console.log('⚠️ Multi-Format API: Trying local Python execution...');
        }
      } catch (error) {
        console.log('⚠️ Multi-Format API: Python serverless function error, trying fallback:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message, error.stack);
        }
      }
    } else {
      console.log('ℹ️ Multi-Format API: Local development mode - skipping Python serverless function');
    }

    // Strategy 2: Try local Python execution (development/local)
    console.log('🐍 Multi-Format API: Starting local Python execution...');
    console.log('📁 Multi-Format API: File path:', filepath);
    console.log('📁 Multi-Format API: Tools directory:', toolsDir);
    
    try {
      // Check if Python is available
      try {
        const { stdout: pythonVersion } = await execAsync('python --version');
        console.log('✅ Multi-Format API: Python found:', pythonVersion.trim());
      } catch (pythonCheckError) {
        console.error('❌ Multi-Format API: Python not found in PATH. Please ensure Python is installed.');
        throw new Error('Python is not available. Please install Python to use the file parser.');
      }
      
      // Create a temporary Python script using the multi-format parser
      const csvOutput = join(uploadsDir, `extracted_${Date.now()}.csv`);
      
      const tempScript = `
import sys
import os
import traceback
# Add multiple paths to find multi_format_parser
sys.path.insert(0, r'${parseFilePythonDir.replace(/\\/g, '\\\\')}')
sys.path.insert(0, r'${legacyToolsDir.replace(/\\/g, '\\\\')}')
sys.path.append(r'${toolsDir.replace(/\\/g, '\\\\')}')

from pathlib import Path
import pandas as pd
import json

def main():
    file_path = Path(r"${filepath.replace(/\\/g, '\\\\')}")
    csv_path = Path(r"${csvOutput.replace(/\\/g, '\\\\')}")
    
    if not file_path.exists():
        error_msg = f"File not found: {file_path}"
        print(error_msg, file=sys.stderr)
        result = {"success": False, "error": error_msg, "transactions": [], "count": 0, "debug": {"file_path": str(file_path), "exists": False}}
        print(json.dumps(result))
        return

    print(f"Parsing {file_path.suffix.upper()} file: {file_path.name}", file=sys.stderr)
    
    # For Excel files, first show what's actually in the file (read more rows for metadata)
    if file_path.suffix.lower() in ['.xls', '.xlsx']:
        try:
            print("\\n=== EXCEL FILE DEBUG INFO ===", file=sys.stderr)
            df_raw = pd.read_excel(file_path, engine='openpyxl', nrows=50, header=None)
            print(f"Excel file shape: {df_raw.shape}", file=sys.stderr)
            print(f"\\nFirst 20 rows (showing metadata):", file=sys.stderr)
            for idx in range(min(20, len(df_raw))):
                row_values = [str(v) if pd.notna(v) else 'NaN' for v in df_raw.iloc[idx].values[:10]]
                print(f"Row {idx}: {' | '.join(row_values)}", file=sys.stderr)
            print("\\n=== END DEBUG INFO ===\\n", file=sys.stderr)
        except Exception as debug_err:
            print(f"Could not read Excel for debugging: {debug_err}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)

    # Import the multi-format parser
    try:
        from multi_format_parser import parse_file
    except ImportError as e:
        error_msg = f"Import error: {e}"
        print(error_msg, file=sys.stderr)
        print(f"Python path: {sys.path}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        result = {"success": False, "error": error_msg, "transactions": [], "count": 0, "debug": {"python_path": sys.path}}
        print(json.dumps(result))
        return

    # Parse the file with proper error handling
    df = None
    parse_error = None
    try:
        result_obj = parse_file(file_path)
        # Handle both DataFrame and tuple returns
        if isinstance(result_obj, tuple):
            df = result_obj[0]
            if not isinstance(df, pd.DataFrame):
                df = pd.DataFrame()
        elif isinstance(result_obj, pd.DataFrame):
            df = result_obj
        else:
            df = pd.DataFrame()
            parse_error = f"Unexpected return type from parse_file: {type(result_obj)}"
    except Exception as e:
        parse_error = str(e)
        print(f"\\n❌ PARSING ERROR: {parse_error}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        df = pd.DataFrame()
    
    # If parsing failed, return error with debug info
    if parse_error or (df is not None and isinstance(df, pd.DataFrame) and df.empty):
        error_details = {
            "error": parse_error or "No transactions found in file",
            "file_name": file_path.name,
            "file_type": file_path.suffix,
            "file_size": file_path.stat().st_size if file_path.exists() else 0
        }
        
        # Add Excel debug info if available
        if file_path.suffix.lower() in ['.xls', '.xlsx']:
            try:
                df_debug = pd.read_excel(file_path, engine='openpyxl', nrows=50)
                # Convert NaN to None for JSON serialization
                df_debug_clean = df_debug.replace({pd.NA: None, pd.NaT: None})
                df_debug_clean = df_debug_clean.where(pd.notnull(df_debug_clean), None)
                
                first_row_dict = None
                if len(df_debug_clean) > 0:
                    first_row = df_debug_clean.iloc[0]
                    first_row_dict = {str(k): (None if pd.isna(v) else str(v)) for k, v in first_row.items()}
                
                sample_data = []
                if len(df_debug_clean) > 0:
                    for idx, row in df_debug_clean.head(5).iterrows():
                        row_dict = {str(k): (None if pd.isna(v) else str(v)) for k, v in row.items()}
                        sample_data.append(row_dict)
                
                error_details["excel_debug"] = {
                    "shape": list(df_debug.shape),
                    "columns": [str(c) for c in df_debug.columns],
                    "first_row": first_row_dict,
                    "sample_data": sample_data
                }
            except Exception as e:
                error_details["excel_debug_error"] = str(e)
        
        result = {
            "success": False,
            "error": error_details["error"],
            "transactions": [],
            "count": 0,
            "debug": error_details
        }
        json_path = csv_path.parent / f"{csv_path.stem}.json"
        with open(json_path, 'w') as f:
            json.dump(result, f, indent=2, default=str)  # Handle NaN values
        print(json.dumps(result, indent=2, default=str))  # Handle NaN values
        return
    
    # Ensure date_iso is properly formatted (YYYY-MM-DD)
    def normalize_date_iso(date_val):
        """Normalize date_iso to YYYY-MM-DD format."""
        if pd.isna(date_val):
            return None
        try:
            if isinstance(date_val, str):
                parsed = pd.to_datetime(date_val, errors='coerce')
            else:
                parsed = pd.to_datetime(date_val, errors='coerce')
            if pd.isna(parsed):
                return None
            return parsed.strftime('%Y-%m-%d')
        except:
            return None
    
    if 'date_iso' not in df.columns or df['date_iso'].isna().all():
        # Generate date_iso from date column if missing
        if 'date' in df.columns:
            df['date_iso'] = df['date'].apply(lambda x: normalize_date_iso(x))
    
    # Normalize all date_iso values
    df['date_iso'] = df['date_iso'].apply(normalize_date_iso)
    
    # Filter out rows with invalid dates
    initial_count = len(df)
    df = df[df['date_iso'].notna()].copy()
    if len(df) < initial_count:
        print(f"Filtered out {initial_count - len(df)} transactions with invalid dates")
    
    # Convert date columns to strings for CSV/JSON serialization
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime('%Y-%m-%d')
    
    # Save to CSV
    try:
        df.to_csv(csv_path, index=False)
    except Exception as e:
        print(f"Warning: Could not save CSV: {e}", file=sys.stderr)
    
    # Also save to JSON for better error handling
    json_path = csv_path.parent / f"{csv_path.stem}.json"
    try:
        # Replace NaN with None for JSON serialization
        df_clean = df.replace({pd.NA: None, pd.NaT: None})
        df_clean = df_clean.where(pd.notnull(df_clean), None)
        
        json_records = df_clean.to_dict(orient='records')
        # Clean up any remaining NaN values
        for record in json_records:
            for key, value in record.items():
                if pd.isna(value) if hasattr(pd, 'isna') else (value != value):  # Check for NaN
                    record[key] = None
        
        result = {
            "success": True,
            "transactions": json_records,
            "count": len(json_records)
        }
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, default=str)
        
        # Print JSON result (truncate if too large)
        result_str = json.dumps(result, ensure_ascii=False, default=str)
        if len(result_str) < 1000000:
            print(result_str)
        else:
            print(json.dumps({"success": True, "transactions": [], "count": len(df), "file": str(json_path)}, default=str))
    except Exception as e:
        print(f"Warning: Could not save JSON: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(f"SUCCESS: Extracted {len(df)} transactions.")
        print(f"CSV saved to: {csv_path}")

if __name__ == "__main__":
    main()
`;

      const tempScriptPath = join(uploadsDir, `temp_parser_${Date.now()}.py`);
      await writeFile(tempScriptPath, tempScript);

      // Execute the Python script
      console.log('🔍 Multi-Format API: Executing Python script:', tempScriptPath);
      console.log('🔍 Multi-Format API: Python command:', `python "${tempScriptPath}"`);
      console.log('🔍 Multi-Format API: Input file exists:', require('fs').existsSync(filepath));
      
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
        console.error('❌ Multi-Format API: Python execution error:', execError.message);
        if (execError.code) {
          console.error('❌ Multi-Format API: Exit code:', execError.code);
        }
        // Don't throw yet - try to parse output if available
      }
      
      console.log('🔍 Multi-Format API: Python stdout length:', stdout.length);
      console.log('🔍 Multi-Format API: Python stdout (first 500 chars):', stdout.substring(0, 500));
      if (stderr) {
        console.log('⚠️ Multi-Format API: Python stderr length:', stderr.length);
        console.log('⚠️ Multi-Format API: Python stderr (full):', stderr);
        // Also log stderr to help debug
        console.error('⚠️ Multi-Format API: Python stderr content:', stderr);
      } else {
        console.log('ℹ️ Multi-Format API: No stderr output from Python');
      }
      
      // Keep temporary script for later cleanup
      console.log('📁 Multi-Format API: Temporary script will be cleaned up after import');

      // Check if Python script failed completely
      if (stderr && !stdout.includes('SUCCESS') && !stdout.includes('transactions') && !stdout.includes('"success"')) {
        console.error('❌ Multi-Format API: Python script error detected');
        console.error('❌ Multi-Format API: stderr:', stderr);
        console.error('❌ Multi-Format API: stdout (last 1000 chars):', stdout.substring(Math.max(0, stdout.length - 1000)));
        
        // Check if it's a Python import error
        if (stderr.includes('ModuleNotFoundError') || stderr.includes('ImportError')) {
          return NextResponse.json({ 
            error: `Failed to parse ${fileType.toUpperCase()} file. Python dependencies are missing.`,
            details: stderr,
            suggestion: 'Please ensure all Python dependencies are installed (pandas, openpyxl, etc.)'
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          error: `Failed to parse ${fileType.toUpperCase()} file. Please ensure it contains valid transaction data.`,
          details: stderr.substring(0, 1000) // Limit error message size
        }, { status: 500 });
      }

      // Try to read from JSON file first (more reliable)
      const jsonOutput = csvOutput.replace('.csv', '.json');
      let transactions: any[] = [];
      let transactionCount = 0;
      let debugInfo: any = null;
      let parseError: string | null = null;

      try {
        // Try parsing JSON from stdout
        const trimmed = stdout.trim();
        let jsonText = '';
        const firstBrace = trimmed.lastIndexOf('{');
        const lastBrace = trimmed.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonText = trimmed.slice(firstBrace, lastBrace + 1);
        }
        
        if (jsonText) {
          try {
            const parsed = JSON.parse(jsonText);
            
            // Check if parsing failed and return error with debug info
            if (parsed.success === false) {
              parseError = parsed.error || 'Parsing failed';
              debugInfo = parsed.debug || null;
              console.error('❌ Multi-Format API: Parsing failed:', parseError);
              if (debugInfo) {
                console.error('❌ Multi-Format API: Debug info:', JSON.stringify(debugInfo, null, 2));
              }
              // Return error immediately with debug info
              return NextResponse.json({
                success: false,
                error: parseError,
                debug: debugInfo,
                transactions: [],
                count: 0
              }, { status: 400 });
            }
            
            if (parsed.file) {
              // JSON was too large and written to file
              const fileContent = await import('fs').then(fs => fs.promises.readFile(parsed.file, 'utf-8'));
              const fileParsed = JSON.parse(fileContent);
              
              // Check for errors in file content too
              if (fileParsed.success === false) {
                parseError = fileParsed.error || 'Parsing failed';
                debugInfo = fileParsed.debug || null;
                return NextResponse.json({
                  success: false,
                  error: parseError,
                  debug: debugInfo,
                  transactions: [],
                  count: 0
                }, { status: 400 });
              }
              
              transactions = Array.isArray(fileParsed?.transactions) ? fileParsed.transactions : [];
              transactionCount = fileParsed?.count || 0;
            } else {
              transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
              transactionCount = parsed?.count || 0;
            }
          } catch (error) {
            console.log('⚠️ Multi-Format API: Failed to parse JSON from stdout, trying file...', error);
          }
        }
      } catch (error) {
        console.log('⚠️ Multi-Format API: Failed to parse JSON from stdout', error);
      }

      // If no transactions from JSON stdout, try reading JSON file
      if (transactions.length === 0 && !parseError) {
        try {
          const { readFile } = await import('fs/promises');
          const fileContent = await readFile(jsonOutput, 'utf-8');
          const parsed = JSON.parse(fileContent);
          
          // Check for errors in JSON file
          if (parsed.success === false) {
            parseError = parsed.error || 'Parsing failed';
            debugInfo = parsed.debug || null;
            console.error('❌ Multi-Format API: Parsing failed (from JSON file):', parseError);
            if (debugInfo) {
              console.error('❌ Multi-Format API: Debug info:', JSON.stringify(debugInfo, null, 2));
            }
            return NextResponse.json({
              success: false,
              error: parseError,
              debug: debugInfo,
              transactions: [],
              count: 0
            }, { status: 400 });
          }
          
          transactions = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
          transactionCount = parsed?.count || 0;
          console.log(`✅ Multi-Format API: Read ${transactions.length} transactions from JSON file`);
        } catch (error) {
          console.log('⚠️ Multi-Format API: Failed to read JSON file, trying CSV...', error);
        }
      }

      // Fallback to CSV parsing if JSON didn't work
      if (transactions.length === 0) {
        let csvContent;
        try {
          const fs = await import('fs');
          // Check if CSV file exists before trying to read
          if (fs.existsSync(csvOutput)) {
            csvContent = await fs.promises.readFile(csvOutput, 'utf-8');
          } else {
            console.log('⚠️ Multi-Format API: CSV file does not exist, skipping CSV fallback');
            csvContent = null;
          }
        } catch (error) {
          console.error('Error reading CSV file:', error);
          // Don't return error - continue to see if we have transactions
          csvContent = null;
        }
        
        // Only parse CSV if we got content
        if (csvContent) {
          // Parse CSV to return structured data
          const lines = csvContent.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            return NextResponse.json({ 
              error: `No transactions found in ${fileType.toUpperCase()} file. Please ensure it contains valid transaction data.` 
            }, { status: 400 });
          }

          const headers = lines[0].split(',');
          transactions = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.every(v => !v.trim())) continue;
            
            const transaction: any = {};
            headers.forEach((header, index) => {
              transaction[header.trim()] = values[index]?.trim() || '';
            });
            transactions.push(transaction);
          }
        }
      }

      if (transactions.length === 0) {
        // If we have debug info, include it in the error
        const errorResponse: any = {
          success: false,
          error: parseError || `No valid transactions found in ${fileType.toUpperCase()} file. Please check the format.`,
          tempFiles: [filepath, csvOutput, jsonOutput, tempScriptPath].filter(Boolean)
        };
        
        if (debugInfo) {
          errorResponse.debug = debugInfo;
        }
        
        // Also include stderr if available for more context
        if (stderr) {
          errorResponse.stderr = stderr.substring(0, 2000); // Limit size
        }
        
        return NextResponse.json(errorResponse, { status: 400 });
      }

      transactionCount = transactionCount || transactions.length;

      // Keep files for cleanup after successful import
      console.log('📁 Multi-Format API: Keeping files for import:', { filepath, csvOutput, tempScriptPath });

      console.log('✅ Multi-Format API: Success! Returning', transactions.length, 'transactions');
      
      return NextResponse.json({
        success: true,
        transactions,
        count: transactionCount,
        fileType: fileType.toUpperCase(),
        message: `Successfully parsed ${transactions.length} transactions from ${fileType.toUpperCase()} file`,
        tempFiles: [filepath, csvOutput, tempScriptPath].filter(Boolean)
      });

    } catch (error) {
      console.error('❌ Multi-Format API: Local Python execution failed:', error);
      
      // Strategy 3: For non-PDF files, we don't have a Node.js fallback yet
      // Return error with helpful message
      try {
        await unlink(filepath);
      } catch {}
      
      console.error('❌ Multi-Format API: All parsing methods failed');
      
      // Extract more detailed error information
      let errorDetails = error instanceof Error ? error.message : 'Unknown error';
      let pythonError = '';
      
      // Try to get Python error from stderr if available
      if (error instanceof Error && error.message.includes('stderr')) {
        pythonError = error.message;
      }
      
      return NextResponse.json({ 
        error: `Failed to parse ${fileType.toUpperCase()} file. Please ensure it contains valid transaction data. All parsing methods (Python serverless and local Python) failed.`,
        details: errorDetails,
        pythonError: pythonError || undefined,
        suggestion: fileType === '.pdf' 
          ? 'For PDF files, try uploading a different bank statement format or ensure the PDF is not corrupted.'
          : fileType === '.xlsx' || fileType === '.xls'
          ? 'For Excel files, ensure the file contains transaction data in a recognizable format (date, description, amount columns).'
          : 'Please ensure the file format is correct and contains transaction data.'
      }, { status: 500 });
    }

    } catch (error) {
      console.error('❌ Multi-Format API: File upload error:', error);
      return NextResponse.json({ 
        error: 'Failed to process file',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
}
