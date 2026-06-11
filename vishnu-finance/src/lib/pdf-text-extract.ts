import 'server-only';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const PARSE_TIMEOUT_MS = 45_000;

type PDFParseCtor = new (options: { data: Buffer }) => {
  getText: () => Promise<{ text?: string }>;
  destroy: () => Promise<void>;
};

let PDFParseClass: PDFParseCtor | null = null;

function getPDFParse(): PDFParseCtor {
  if (!PDFParseClass) {
    const mod = require('pdf-parse') as { PDFParse: PDFParseCtor };
    PDFParseClass = mod.PDFParse;
  }
  return PDFParseClass;
}

/** Extract plain text from a PDF buffer using pdf-parse v2 (PDFParse class). */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const PDFParse = getPDFParse();
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await Promise.race([
      parser.getText(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('PDF parsing timed out after 45 seconds')),
          PARSE_TIMEOUT_MS,
        );
      }),
    ]);
    return result.text?.trim() ?? '';
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export function pdfExtractErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error);

  if (/timed out/i.test(message)) {
    return 'PDF took too long to read (over 45s). Try again — after the first dev compile, uploads are usually 5–15 seconds.';
  }
  if (name === 'PasswordException' || /password/i.test(message)) {
    return 'This PDF appears to be password-protected. Export again from MF Central without a password, or remove the password in your PDF app first.';
  }
  if (name === 'InvalidPDFException' || /invalid pdf/i.test(message)) {
    return 'The file is not a readable PDF. Re-download from MF Central and upload the original file (not a screenshot or photo).';
  }
  return `Could not extract text from this PDF (${name || 'parse error'}). Try re-exporting from MF Central.`;
}

export const CAS_PARSE_TIMEOUT_MS = PARSE_TIMEOUT_MS;
