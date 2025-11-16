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
      return { success: true, data };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText };
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
        console.log('⚠️ Multi-Format API: Python parser failed, trying local Python execution...');
      }
    } catch (error) {
      console.log('⚠️ Multi-Format API: Python function error, trying fallback:', error);
    }

    // Strategy 2: Try local Python execution (development/local)
    try {
      // Create a temporary Python script using the multi-format parser
      const csvOutput = join(uploadsDir, `extracted_${Date.now()}.csv`);
      
      const tempScript = `
import sys
import os
sys.path.append(r'${toolsDir.replace(/\\/g, '\\\\')}')

# Import the multi-format parser
from multi_format_parser import parse_file
from pathlib import Path
import pandas as pd
import json

def main():
    file_path = Path(r"${filepath.replace(/\\/g, '\\\\')}")
    csv_path = Path(r"${csvOutput.replace(/\\/g, '\\\\')}")
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    print(f"Parsing {file_path.suffix.upper()} file: {file_path.name}")

    df = parse_file(file_path)
    
    if df.empty:
        print("No transactions found")
        result = {"success": True, "transactions": [], "count": 0}
        with open(csv_path.parent / f"{csv_path.stem}.json", 'w') as f:
            json.dump(result, f)
        print(json.dumps(result))
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
        json_records = df.to_dict(orient='records')
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
      
      const { stdout, stderr } = await execAsync(`python "${tempScriptPath}"`);
      
      console.log('🔍 Multi-Format API: Python stdout:', stdout);
      if (stderr) {
        console.log('⚠️ Multi-Format API: Python stderr:', stderr);
      }
      
      // Keep temporary script for later cleanup
      console.log('📁 Multi-Format API: Temporary script will be cleaned up after import');

      if (stderr && !stdout.includes('SUCCESS') && !stdout.includes('transactions')) {
        console.error('❌ Multi-Format API: Python script error:', stderr);
        return NextResponse.json({ 
          error: `Failed to parse ${fileType.toUpperCase()} file. Please ensure it contains valid transaction data.`,
          details: stderr 
        }, { status: 500 });
      }

      // Try to read from JSON file first (more reliable)
      const jsonOutput = csvOutput.replace('.csv', '.json');
      let transactions: any[] = [];
      let transactionCount = 0;

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
            if (parsed.file) {
              // JSON was too large and written to file
              const fileContent = await import('fs').then(fs => fs.promises.readFile(parsed.file, 'utf-8'));
              const fileParsed = JSON.parse(fileContent);
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
      if (transactions.length === 0) {
        try {
          const { readFile } = await import('fs/promises');
          const fileContent = await readFile(jsonOutput, 'utf-8');
          const parsed = JSON.parse(fileContent);
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
          csvContent = await import('fs').then(fs => fs.promises.readFile(csvOutput, 'utf-8'));
        } catch (error) {
          console.error('Error reading CSV file:', error);
          return NextResponse.json({ 
            error: 'Failed to read parsed data. Please try again.',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
        
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

      if (transactions.length === 0) {
        return NextResponse.json({ 
          error: `No valid transactions found in ${fileType.toUpperCase()} file. Please check the format.`,
          tempFiles: [filepath, csvOutput, jsonOutput, tempScriptPath].filter(Boolean)
        }, { status: 400 });
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
      return NextResponse.json({ 
        error: `Failed to parse ${fileType.toUpperCase()} file. Please ensure it contains valid transaction data. All parsing methods (Python serverless and local Python) failed.`,
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: fileType === '.pdf' 
          ? 'For PDF files, try uploading a different bank statement format.'
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
