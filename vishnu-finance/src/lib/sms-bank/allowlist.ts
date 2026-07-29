/** Indian bank / UPI SMS sender allowlist (expandable). */

const EXPLICIT_SENDERS = [
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
  'UNIONB',
  'CANBNK',
  'BOBSMS',
  'CBISBI',
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

const SENDER_PREFIX = /^(VK|AX|VM|JD|AD|CP)-/i;
const BANKISH = /XX-[A-Z0-9]{4,}/i;

export function normalizeSmsSender(address: string): string {
  return address.trim().replace(/^\+91/, '').toUpperCase();
}

export function isIndianBankSmsSender(address: string | null | undefined): boolean {
  if (!address) return false;
  const cleaned = normalizeSmsSender(address);
  if (EXPLICIT_SENDERS.some((s) => cleaned.includes(s))) return true;
  if (SENDER_PREFIX.test(cleaned) && cleaned.length >= 6) return true;
  if (BANKISH.test(cleaned)) return true;
  return false;
}

export function looksLikeOtpOnlySms(body: string): boolean {
  const lower = body.toLowerCase();
  const hasTxn =
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
