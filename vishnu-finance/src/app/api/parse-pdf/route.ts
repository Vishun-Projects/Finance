import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { callPythonParser } from '@/lib/python-parser-client';
import { enrichParsedTransactionsFromHistory } from '@/lib/parse-enrichment';

/**
 * Call Python serverless/microservice function for PDF parsing
 */
async function tryPythonParser(
  pdfBuffer: Buffer,
  bankHint: string,
  bankParserConfigs: any[],
  password?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const pdfBase64 = pdfBuffer.toString('base64');
    return await callPythonParser({
      pdf_data: pdfBase64,
      bank: bankHint,
      bank_profiles: bankParserConfigs,
      password: password || '',
    });
  } catch (error) {
    console.error('❌ PDF API: Python function call failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const cause = error instanceof Error && 'cause' in error ? String((error as Error & { cause?: unknown }).cause) : '';
    if (cause.includes('ENOTFOUND http') || message.includes('ENOTFOUND http')) {
      return {
        success: false,
        error:
          'Invalid Python parser URL (double http://). Restart the dev server after the latest fix, or set PYTHON_PARSER_URL=http://127.0.0.1:8000/api/parser in .env.local',
      };
    }
    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      return {
        success: false,
        error:
          'Python parser service is not reachable. Start it with: cd python_api && uvicorn main:app --host 127.0.0.1 --port 8000',
      };
    }
    return { success: false, error: message };
  }
}

export async function POST(request: NextRequest) {
  console.log('🔍 PDF API: Starting request processing');
  try {
    const formData = await request.formData() as unknown as globalThis.FormData;
    const file = formData.get('file') as File;
    const password = (formData.get('password') as string | null) || '';
    const bankHint = (formData.get('bankCode') as string || null)?.toLowerCase() || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Fetch Bank Configurations from DB
    let bankParserConfigs: any[] = [];
    try {
      bankParserConfigs = await (prisma as any).bankParserConfig.findMany({
        where: { isActive: true },
        select: { bankCode: true, bankName: true, detectionKeywords: true, headerKeywords: true, columns: true, parserType: true }
      });
    } catch (dbErr) {
      console.warn('⚠️ PDF API: Failed to load bank configs from DB, using defaults', dbErr);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalName = file.name || 'document.pdf';
    const filename = `statement_${Date.now()}${originalName.substring(originalName.lastIndexOf('.'))}`;

    // Upload to Supabase Storage (bank-statements bucket)
    let remoteFilePath = '';
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bank-statements')
          .upload(filename, buffer, { contentType: file.type, upsert: false });

        if (!uploadError && uploadData) {
          remoteFilePath = uploadData.path;
          console.log('✅ PDF API: Uploaded to Supabase:', remoteFilePath);
        }
      }
    } catch (supaError) {
      console.warn('⚠️ PDF API: Supabase upload error:', supaError);
    }

    console.log('🐍 PDF API: Attempting Python microservice function...');
    const pythonResult = await tryPythonParser(buffer, bankHint, bankParserConfigs, password);

    if (pythonResult.success && pythonResult.data) {
      console.log('✅ PDF API: Python parser succeeded');
      const result = pythonResult.data;
      
      if (result.status === 'needs_password') {
        return NextResponse.json({ success: false, status: 'needs_password', error: 'Password required' }, { status: 401 });
      }

      let transactions = result.transactions || [];
      const userId = (formData.get('userId') as string) || '';

      // Historical Intelligence: batch lookup (max 3 queries, not N per transaction)
      if (userId && transactions.length > 0) {
        console.log(`🤖 PDF API: Enriching ${transactions.length} transactions for userId: ${userId}`);
        try {
          transactions = await enrichParsedTransactionsFromHistory(userId, transactions);
        } catch (enrichErr) {
          console.warn('⚠️ PDF API: History enrichment failed, returning parsed data only:', enrichErr);
        }
      }

      return NextResponse.json({
        success: result.success || true,
        transactions: transactions,
        count: result.count || transactions.length,
        metadata: result.metadata || {},
        parserMethod: result.parserMethod || result.metadata?.parserMethod || 'primary',
        remoteFile: remoteFilePath,
      });
    } else {
      console.log('⚠️ PDF API: Python parser failed:', pythonResult.error);
      return NextResponse.json({
        success: false,
        error: pythonResult.error || 'Python serverless function failed.'
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
