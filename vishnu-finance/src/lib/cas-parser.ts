export interface CasHolding {
  schemeName: string;
  folio?: string;
  units?: number;
  nav?: number;
  value?: number;
  isin?: string;
}

export interface CasParseResult {
  isLikelyCas: boolean;
  holderName?: string;
  pan?: string;
  statementDate?: string;
  registrar?: string;
  holdings: CasHolding[];
  folioCount: number;
  parseWarning?: string;
}

function parseIndianAmount(raw: string): number | undefined {
  const n = Number(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** Extract holdings from CAS PDF text (CAMS / KFintech / MF Central). */
export function parseCasText(text: string): CasParseResult {
  const normalized = text.replace(/\r/g, '\n');

  const isLikelyCas =
    /consolidated account statement|cas report|mf central|mutual fund consolidated|folio no|folio number/i.test(
      normalized,
    );

  const panMatch = normalized.match(/\bPAN\s*[:\-]?\s*([A-Z]{5}\d{4}[A-Z])\b/i);
  const dateMatch = normalized.match(
    /(?:as on|statement date|report date|date)\s*[:\-]?\s*(\d{1,2}[\-/]\w{3}[\-/]\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
  );

  let registrar: string | undefined;
  if (/cams/i.test(normalized)) registrar = 'CAMS';
  else if (/kfintech|karvy/i.test(normalized)) registrar = 'KFintech';
  else if (/mf central/i.test(normalized)) registrar = 'MF Central';

  const folioMatches = normalized.match(/folio\s*(?:no|number)?\s*[:\-]?\s*[\d/]+/gi) ?? [];
  const holdings: CasHolding[] = [];
  const seen = new Set<string>();

  // Block split: many CAS PDFs repeat scheme blocks with unit balance + market value
  const blocks = normalized.split(/(?=folio\s*(?:no|number)?\s*[:\-])/i);

  for (const block of blocks) {
    const folioMatch = block.match(/folio\s*(?:no|number)?\s*[:\-]?\s*([\d/\s]+)/i);
    const folio = folioMatch?.[1]?.replace(/\s+/g, '').trim();

    const schemeMatch =
      block.match(/(?:scheme\s*(?:name)?\s*[:\-]?\s*)([^\n]{8,120})/i) ??
      block.match(
        /([A-Z][A-Za-z0-9&().,\- ]{10,100}(?:Fund|Plan|Option|Growth|Direct|IDCW|Index)[A-Za-z0-9&().,\- ]*)/,
      );

    const isinMatch = block.match(/\bISIN\s*[:\-]?\s*(INF[A-Z0-9]{9})\b/i);
    const unitsMatch = block.match(
      /(?:closing\s*)?(?:unit\s*)?balance\s*[:\-]?\s*([\d,]+\.?\d*)/i,
    );
    const navMatch = block.match(/NAV\s*(?:on\s*[\d\-A-Za-z ]+)?\s*[:\-]?\s*([\d,]+\.?\d*)/i);
    const valueMatch = block.match(/market\s*value\s*[:\-]?\s*[₹]?\s*([\d,]+\.?\d*)/i);

    const schemeName = schemeMatch?.[1]?.trim().replace(/\s{2,}/g, ' ');
    if (!schemeName || schemeName.length < 8) continue;

    const key = `${folio ?? ''}:${schemeName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    holdings.push({
      schemeName,
      folio,
      isin: isinMatch?.[1],
      units: unitsMatch ? parseIndianAmount(unitsMatch[1]) : undefined,
      nav: navMatch ? parseIndianAmount(navMatch[1]) : undefined,
      value: valueMatch ? parseIndianAmount(valueMatch[1]) : undefined,
    });
  }

  // Fallback: line scan for long fund-like names when block parsing finds nothing
  if (holdings.length === 0) {
    for (const line of normalized.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.length < 15 || trimmed.length > 120) continue;
      if (!/(fund|plan|growth|direct|index|elss|cap)/i.test(trimmed)) continue;
      if (/^(page|email|phone|address|pan|folio|isin|date)/i.test(trimmed)) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      holdings.push({ schemeName: trimmed });
      if (holdings.length >= 30) break;
    }
  }

  const holderMatch = normalized.match(
    /(?:investor\s*name|holder\s*name|name\s*of\s*holder)\s*[:\-]?\s*([A-Za-z .]{3,60})/i,
  );

  return {
    isLikelyCas,
    holderName: holderMatch?.[1]?.trim(),
    pan: panMatch?.[1],
    statementDate: dateMatch?.[1],
    registrar,
    holdings: holdings.slice(0, 40),
    folioCount: Math.max(folioMatches.length, new Set(holdings.map((h) => h.folio).filter(Boolean)).size),
    parseWarning:
      holdings.length === 0
        ? 'Could not read scheme rows from this PDF. Use the latest password-free PDF from MF Central (mfcentral.in).'
        : undefined,
  };
}

export async function parseCasPdfBuffer(buffer: Buffer): Promise<CasParseResult> {
  const { extractPdfText } = await import('./pdf-text-extract');
  const text = await extractPdfText(buffer);
  if (text.length < 80) {
    return {
      isLikelyCas: false,
      holdings: [],
      folioCount: 0,
      parseWarning:
        'Very little text was found in this PDF. It may be a scanned image, corrupted export, or non-standard format. Re-download the CAS PDF from MF Central (mfcentral.in) and upload the original file.',
    };
  }
  return parseCasText(text);
}
