import { withAuth } from '@/lib/api-auth';
import { parseCasPdfBuffer } from '@/lib/cas-parser';
import { saveCasUpload } from '@/lib/cas-persistence';
import { pdfExtractErrorMessage } from '@/lib/pdf-text-extract';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function casErrorPayload(
  fileName: string,
  sizeBytes: number,
  userId: string,
  detail: string,
) {
  return {
    message: detail,
    userId,
    fileName,
    sizeBytes,
    isLikelyCas: false,
    folioCount: 0,
    holdings: [] as [],
    parseWarning: detail,
    disclaimer: 'Read-only holdings parsing for your records — not investment advice.',
  };
}

export const POST = withAuth(async (request, user) => {
  let fileName = 'upload.pdf';
  let sizeBytes = 0;

  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 });
    }

    fileName = file.name;
    sizeBytes = file.size;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: 'File must be under 10 MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseCasPdfBuffer(buffer);
    const totalValue = parsed.holdings.reduce((s, h) => s + (h.value ?? 0), 0);

    try {
      await saveCasUpload(user.id, file.name, file.size, parsed, totalValue);
    } catch (persistError) {
      console.error('[cas/upload] persist failed', persistError);
    }

    return NextResponse.json({
      message: parsed.isLikelyCas
        ? parsed.holdings.length > 0
          ? `CAS parsed — ${parsed.holdings.length} scheme(s) found.`
          : 'CAS detected but no schemes could be read. See tips below.'
        : 'This may not be a mutual fund CAS. Upload the Consolidated Account Statement from MF Central.',
      userId: user.id,
      fileName: file.name,
      sizeBytes: file.size,
      isLikelyCas: parsed.isLikelyCas,
      folioCount: parsed.folioCount,
      holderName: parsed.holderName,
      pan: parsed.pan,
      statementDate: parsed.statementDate,
      registrar: parsed.registrar,
      holdings: parsed.holdings,
      totalValue: totalValue > 0 ? Math.round(totalValue) : undefined,
      parseWarning: parsed.parseWarning,
      disclaimer: 'Read-only holdings parsing for your records — not investment advice.',
    });
  } catch (error) {
    console.error('[cas/upload]', error);
    const detail = pdfExtractErrorMessage(error);
    return NextResponse.json(casErrorPayload(fileName, sizeBytes, user.id, detail));
  }
});
