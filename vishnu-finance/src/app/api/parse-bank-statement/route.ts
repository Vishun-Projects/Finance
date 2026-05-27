import { NextRequest, NextResponse } from 'next/server';
import { unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { callPythonParser } from '@/lib/python-parser-client';

// Dynamic import for Node.js parser fallback (PDF only)
const parsePDFWithNode = async (filePath: string, bankHint?: string) => {
  try {
    const { parsePDFWithNode: parser } = await import('@/lib/parsers/node-pdf-parser');
    return await parser(filePath, bankHint);
  } catch (error) {
    console.error('Failed to load Node.js parser:', error);
    return { success: false, transactions: [], count: 0, metadata: {} };
  }
};

/**
 * Deprecated: use /api/parse-pdf instead.
 * Kept for backward compatibility — forwards to the unified Python parser.
 */
async function tryPythonParser(
  fileBuffer: Buffer,
  bankType: string | null,
  password?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const fileBase64 = fileBuffer.toString('base64');
    return await callPythonParser({
      pdf_data: fileBase64,
      bank: (bankType || '').toLowerCase(),
      bank_profiles: [],
      password: password || '',
    });
  } catch (error) {
    console.log('⚠️ Parse Bank Statement API: Python function call failed, will try fallback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  console.log('🏦 Parse Bank Statement API: Starting request processing');

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bankType = formData.get('bankType') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    let fileType = null;

    if (fileName.endsWith('.pdf')) {
      fileType = '.pdf';
    } else if (fileName.endsWith('.xls')) {
      fileType = '.xls';
    } else if (fileName.endsWith('.xlsx')) {
      fileType = '.xlsx';
    }

    if (!fileType) {
      return NextResponse.json({
        error: 'Unsupported file type. Please upload PDF, XLS, or XLSX files.'
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('🐍 Parse Bank Statement API: Attempting Python serverless/microservice function...');
    const pythonResult = await tryPythonParser(buffer, bankType);

    if (pythonResult.success && pythonResult.data) {
      console.log('✅ Parse Bank Statement API: Python parser succeeded');
      const result = pythonResult.data;

      return NextResponse.json({
        success: result.success || true,
        transactions: result.transactions || [],
        count: result.count || result.transactions?.length || 0,
        bankType: result.bankType || bankType || 'UNKNOWN',
        metadata: result.metadata || {},
        message: result.message || `Successfully parsed ${result.count || result.transactions?.length || 0} transactions from ${result.bankType || bankType || 'UNKNOWN'} statement`,
      });
    }

    console.error('❌ Parse Bank Statement API: Python execution failed:', pythonResult.error);

    // Strategy 2: Fallback to Node.js parser (PDF only)
    if (fileType === '.pdf') {
      try {
        console.log('📄 Parse Bank Statement API: Attempting Node.js fallback parser...');

        // Save temporary file solely for Node.js fallback parser
        const uploadsDir = join(tmpdir(), 'bank-statement-fallback');
        await import('fs/promises').then(fs => fs.mkdir(uploadsDir, { recursive: true }).catch(() => { }));
        const filepath = join(uploadsDir, `fallback_${Date.now()}.pdf`);
        await writeFile(filepath, buffer);

        const nodeResult = await parsePDFWithNode(filepath, bankType || undefined);

        // Clean up fallback file
        try {
          await unlink(filepath);
        } catch { }

        if (nodeResult.success && nodeResult.transactions.length > 0) {
          console.log(`✅ Parse Bank Statement API: Node.js parser succeeded with ${nodeResult.transactions.length} transactions`);
          return NextResponse.json({
            success: true,
            transactions: nodeResult.transactions,
            count: nodeResult.count,
            bankType: bankType || 'UNKNOWN',
            metadata: nodeResult.metadata || {},
            warning: 'Parsed using fallback parser. Results may be less accurate than Python parser.',
          });
        }
      } catch (nodeError) {
        console.error('❌ Parse Bank Statement API: Node.js parser also failed:', nodeError);
      }
    }

    return NextResponse.json({
      error: 'Failed to parse bank statement. Please ensure it contains valid transaction data. All parsing methods failed.',
      details: pythonResult.error || 'Unknown error',
      suggestion: fileType === '.pdf'
        ? 'For PDF files, try uploading a different bank statement format or ensure the file is not corrupted.'
        : 'Please ensure the Excel file format is correct and contains transaction data.'
    }, { status: 500 });

  } catch (error) {
    console.error('❌ Parse Bank Statement API: Upload error:', error);
    return NextResponse.json({
      error: 'Failed to process file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
