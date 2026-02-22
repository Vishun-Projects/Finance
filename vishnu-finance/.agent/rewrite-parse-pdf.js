const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'app', 'api', 'parse-pdf', 'route.ts');
const code = fs.readFileSync(targetFile, 'utf8');

// We want to replace tryPythonParser and the bulk of the POST handler
// We will look for `export async function POST` and replace everything below it.

let newCode = `import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';

/**
 * Call Python serverless/microservice function for PDF parsing
 */
async function tryPythonParser(pdfBuffer: Buffer, bankHint: string, bankParserConfigs: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    let baseUrl: string;
    const isVercel = !!process.env.VERCEL_URL || !!process.env.VERCEL;
    
    if (isVercel) {
      baseUrl = \`https://\${process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL}\`;
    } else {
      baseUrl = 'http://127.0.0.1:8000'; // Target local FastAPI microservice
    }

    const pythonFunctionUrl = \`\${baseUrl}/api/parser\`;

    // Convert buffer to base64
    const pdfBase64 = pdfBuffer.toString('base64');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    }

    const response = await fetch(pythonFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'pdf',
        payload: {
          pdf_data: pdfBase64,
          bank: bankHint,
          bank_profiles: bankParserConfigs
        }
      }),
    });

    if (response.ok) {
      const data = await response.json();
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
        // Not JSON
      }
      console.error(\`❌ PDF API: Python function returned error status \${response.status}:\`, errorMessage);
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error('❌ PDF API: Python function call failed:', error);
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
    const filename = \`statement_\${Date.now()}\${originalName.substring(originalName.lastIndexOf('.'))}\`;

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

    console.log('🐍 PDF API: Attempting Python serverless/microservice function...');
    const pythonResult = await tryPythonParser(buffer, bankHint, bankParserConfigs);

    if (pythonResult.success && pythonResult.data) {
      console.log('✅ PDF API: Python parser succeeded');
      const result = pythonResult.data;

      if (result.status === 'needs_password') {
        return NextResponse.json({ success: false, status: 'needs_password', error: 'Password required' }, { status: 401 });
      }

      return NextResponse.json({
        success: result.success || true,
        transactions: result.transactions || [],
        count: result.count || 0,
        metadata: result.metadata || {},
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
`;

fs.writeFileSync(targetFile, newCode);
console.log('Updated parse-pdf/route.ts successfully.');
