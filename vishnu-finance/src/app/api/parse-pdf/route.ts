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
      const pythonScript = join(toolsDir, 'bank_statement_parser.py');
      const csvOutput = join(uploadsDir, `extracted_${Date.now()}.csv`);
      const dbOutput = join(uploadsDir, `transactions_${Date.now()}.db`);
      
      // Create a temporary Python script with the accurate parser
      const tempScript = `
import sys
import os
sys.path.append(r'${toolsDir.replace(/\\/g, '\\\\')}')

# Update the configuration
PDF_FILE = r"${filepath.replace(/\\/g, '\\\\')}"
CSV_FILE = r"${csvOutput.replace(/\\/g, '\\\\')}"
DB_FILE = r"${dbOutput.replace(/\\/g, '\\\\')}"

# Import the accurate parser
from accurate_parser import parse_bank_statement_accurately
from pathlib import Path
import pandas as pd

def main():
    pdf_path = Path(PDF_FILE)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    print(f"Extracting transactions from: {pdf_path.name}")

    df = parse_bank_statement_accurately(pdf_path)
    
    if df.empty:
        print("No transactions found")
        return
    
    # Convert dates
    df["date_iso"] = pd.to_datetime(df["date"], errors="coerce").dt.date
    
    # Save to CSV and DB
    df.to_csv(CSV_FILE, index=False)
    
    import sqlite3
    conn = sqlite3.connect(DB_FILE)
    df.to_sql("transactions", conn, if_exists="replace", index=False)
    conn.commit()
    conn.close()

    print(f"SUCCESS: Extracted {len(df)} transactions.")
    print(f"CSV saved to: {CSV_FILE}")
    print(f"SQLite DB saved to: {DB_FILE}")

if __name__ == "__main__":
    main()
`;

      const tempScriptPath = join(uploadsDir, `temp_parser_${Date.now()}.py`);
      await writeFile(tempScriptPath, tempScript);

      // Execute the Python script
      console.log('🔍 PDF API: Executing Python script:', tempScriptPath);
      console.log('🔍 PDF API: Python command:', `python "${tempScriptPath}"`);
      
      const { stdout, stderr } = await execAsync(`python "${tempScriptPath}"`);
      
      console.log('🔍 PDF API: Python stdout:', stdout);
      if (stderr) {
        console.log('⚠️ PDF API: Python stderr:', stderr);
      }
      
      // Clean up temporary script
      await unlink(tempScriptPath);
      console.log('✅ PDF API: Temporary script cleaned up');

      if (stderr && !stdout.includes('SUCCESS')) {
        console.error('❌ PDF API: Python script error:', stderr);
        return NextResponse.json({ 
          error: 'Failed to parse PDF. Please ensure it\'s a valid bank statement.',
          details: stderr 
        }, { status: 500 });
      }

      // Read the generated CSV
      let csvContent;
      try {
        csvContent = await import('fs').then(fs => fs.promises.readFile(csvOutput, 'utf-8'));
      } catch (error) {
        console.error('Error reading CSV file:', error);
        return NextResponse.json({ 
          error: 'Failed to read parsed data. Please try again.' 
        }, { status: 500 });
      }
      
      // Parse CSV to return structured data
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return NextResponse.json({ 
          error: 'No transactions found in PDF. Please ensure it\'s a valid bank statement.' 
        }, { status: 400 });
      }

      const headers = lines[0].split(',');
      const transactions = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.every(v => !v.trim())) continue;
        
        const transaction: any = {};
        headers.forEach((header, index) => {
          transaction[header.trim()] = values[index]?.trim() || '';
        });
        transactions.push(transaction);
      }

      if (transactions.length === 0) {
        return NextResponse.json({ 
          error: 'No valid transactions found in PDF. Please check the format.' 
        }, { status: 400 });
      }

      // Clean up files
      await unlink(filepath);
      await unlink(csvOutput);
      await unlink(dbOutput);

      console.log('✅ PDF API: Success! Returning', transactions.length, 'transactions');
      
      return NextResponse.json({
        success: true,
        transactions,
        count: transactions.length,
        message: `Successfully parsed ${transactions.length} transactions from PDF`
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
