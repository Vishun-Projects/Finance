import * as crypto from 'crypto';
import { toLocalISODate } from './date-range';

/** Extract a stable bank reference from narration for dedup hashing. */
export function extractStableReference(description: string): string | null {
  if (!description) return null;

  const patterns = [
    /\/UPI\/(\d{10,})\//i,
    /UPI:(\d{10,}):/i,
    /UPI[:\/\s-]+(\d{10,})/i,
    /NEFT[\/\s-]+([A-Z0-9]{8,24})/i,
    /IMPS[\/\s-]+([A-Z0-9]{8,24})/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  const longNums = description.match(/\b(\d{12,})\b/g);
  if (longNums && longNums.length > 0) {
    return longNums[longNums.length - 1];
  }

  return null;
}

export function buildInFileDedupKey(input: {
  transactionDate: Date;
  description: string;
  creditAmount: number;
  debitAmount: number;
  transactionId?: string | null;
  balance?: number | null;
}): string {
  const dateStr = toLocalISODate(input.transactionDate);
  const credit = Number(input.creditAmount || 0).toFixed(2);
  const debit = Number(input.debitAmount || 0).toFixed(2);
  const ref = input.transactionId?.trim() || extractStableReference(input.description) || '';
  const balance =
    input.balance != null && !Number.isNaN(Number(input.balance))
      ? Number(input.balance).toFixed(2)
      : '';

  const descFingerprint =
    ref || balance
      ? ''
      : input.description
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .trim()
          .substring(0, 80);

  return `${dateStr}|${credit}|${debit}|${ref}|${balance}|${descFingerprint}`;
}

export function generateDedupHash(
  userId: string,
  tx: {
    transactionDate: Date;
    description: string;
    creditAmount: number;
    debitAmount: number;
    transactionId?: string | null;
    balance?: number | null;
  },
): string {
  if (tx.transactionId && tx.transactionId.trim().length > 5) {
    return `id_${userId}_${tx.transactionId.trim()}`;
  }

  const dateStr = toLocalISODate(tx.transactionDate);
  const credit = Number(tx.creditAmount || 0).toFixed(2);
  const debit = Number(tx.debitAmount || 0).toFixed(2);
  const stableRef = extractStableReference(tx.description);
  const balancePart =
    tx.balance != null && !Number.isNaN(Number(tx.balance))
      ? `|bal_${Number(tx.balance).toFixed(2)}`
      : '';

  const fingerprint = stableRef
    ? `${userId}|${dateStr}|${credit}|${debit}|${stableRef}${balancePart}`
    : `${userId}|${dateStr}|${credit}|${debit}${balancePart}|${tx.description
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim()
        .substring(0, 100)}`;

  return crypto.createHash('md5').update(fingerprint).digest('hex');
}

export function areDescriptionsSimilar(desc1: string, desc2: string): boolean {
  const ref1 = extractStableReference(desc1);
  const ref2 = extractStableReference(desc2);
  if (ref1 && ref2 && ref1 !== ref2) {
    return false;
  }

  if (desc1 === desc2) return true;

  const norm1 = desc1.replace(/[^a-z0-9]/g, '');
  const norm2 = desc2.replace(/[^a-z0-9]/g, '');

  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  if (norm1.length < 5 || norm2.length < 5) return false;

  const lenDiff = Math.abs(norm1.length - norm2.length);
  if (lenDiff > Math.max(norm1.length, norm2.length) * 0.3) return false;

  let matches = 0;
  const minLen = Math.min(norm1.length, norm2.length);
  for (let i = 0; i < minLen; i++) {
    if (norm1[i] === norm2[i]) matches++;
  }

  return matches / minLen > 0.7;
}

export type InFileDedupRecord = {
  date?: string;
  date_iso?: string;
  debit?: number | string;
  credit?: number | string;
  description?: string;
  transactionId?: string;
  balance?: number | string;
};

function parseInFileRecordDate(record: InFileDedupRecord): Date | null {
  const raw = record.date_iso || record.date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function countInFileDuplicateRecords(records: InFileDedupRecord[]): {
  uniqueCount: number;
  inFileDuplicate: number;
} {
  const seenInFile = new Set<string>();
  let inFileDuplicate = 0;
  let uniqueCount = 0;

  records.forEach((record) => {
    const date = parseInFileRecordDate(record);
    if (!date) {
      uniqueCount++;
      return;
    }
    const key = buildInFileDedupKey({
      transactionDate: date,
      description: record.description || '',
      creditAmount: Number(record.credit) || 0,
      debitAmount: Number(record.debit) || 0,
      transactionId: record.transactionId,
      balance: record.balance != null ? Number(record.balance) : null,
    });
    if (seenInFile.has(key)) {
      inFileDuplicate++;
      return;
    }
    seenInFile.add(key);
    uniqueCount++;
  });

  return { uniqueCount, inFileDuplicate };
}
