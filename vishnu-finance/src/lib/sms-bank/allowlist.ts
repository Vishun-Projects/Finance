/** Indian bank / UPI SMS sender allowlist — match bank codes, not carrier prefixes. */

/** Core bank / PSP codes found inside DLT sender IDs (e.g. BT-INDBNK-S, VK-HDFCBK). */
const BANK_CODES = [
  'HDFCBK',
  'SBIINB',
  'SBIBNK',
  'ICICIB',
  'AXISBK',
  'KOTAKB',
  'BOIIND',
  'PNBSMS',
  'YESBNK',
  'IDFCFB',
  'FEDBNK',
  'INDBNK',
  'INDIANB',
  'INDUSB',
  'UNIONB',
  'CANBNK',
  'BOBSMS',
  'CBISMS',
  'UCOBNK',
  'IOBBANK',
  'RBLBNK',
  'BANDHN',
  'AUBANK',
  'NPCI',
  'PHONPE',
  'PHONEPE',
  'GPAY',
  'PAYTM',
  'BHIM',
  'AMAZONP',
  'AIRTELP',
] as const;

/**
 * DLT-style sender: optional 2-letter operator prefix + bank code + optional suffix.
 * Examples: BT-INDBNK-S, BZ-INDBNK-S, VK-HDFCBK, AX-ICICIB, VM-BOIIND
 * Does NOT hardcode BT/BZ/BV — any 2-letter prefix is accepted.
 */
const DLT_SENDER_RE = /^[A-Z]{2}-[A-Z0-9]{4,}(?:-[A-Z0-9]+)?$/i;

/** Fallback: XX-BANKXX style without requiring known code list. */
const GENERIC_BANK_SENDER_RE = /^[A-Z]{2}-[A-Z]{3,}(?:-[A-Z0-9]+)?$/i;

export function normalizeSmsSender(address: string): string {
  return address.trim().replace(/^\+91/, '').toUpperCase();
}

export function isIndianBankSmsSender(address: string | null | undefined): boolean {
  if (!address) return false;
  const cleaned = normalizeSmsSender(address);

  if (BANK_CODES.some((code) => cleaned.includes(code))) return true;
  if (DLT_SENDER_RE.test(cleaned)) return true;
  if (GENERIC_BANK_SENDER_RE.test(cleaned)) return true;
  return false;
}

/** Upcoming autopay / mandate notices are not completed transactions. */
export function looksLikeUpcomingOrMandateSms(body: string): boolean {
  const lower = body.toLowerCase();
  if (lower.includes('will be debited')) return true;
  if (lower.includes('autopay') && (lower.includes('pause mandate') || lower.includes('towards'))) {
    return true;
  }
  if (lower.includes('mandate') && lower.includes('will be')) return true;
  if (lower.includes('scheduled') && lower.includes('debit')) return true;
  return false;
}

export function looksLikeOtpOnlySms(body: string): boolean {
  const lower = body.toLowerCase();
  const hasTxn =
    /\bsent\s+rs/i.test(body) ||
    lower.includes('debited') ||
    lower.includes('credited') ||
    lower.includes('spent') ||
    lower.includes('paid') ||
    lower.includes('received') ||
    /rs\.?\s*[\d,]+/i.test(body) ||
    /inr\s*[\d,]+/i.test(body);

  if (!hasTxn) {
    if (lower.includes('otp') || lower.includes('one time password')) return true;
    if (lower.includes('do not share') || lower.includes("don't share")) return true;
  }

  if (
    (lower.includes('do not share') || lower.includes("don't share")) &&
    (lower.includes('otp') || lower.includes('verification')) &&
    !hasTxn
  ) {
    return true;
  }

  return false;
}
