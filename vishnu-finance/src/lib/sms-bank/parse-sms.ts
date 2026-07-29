import { extractStableReference } from '@/lib/import-dedup-refs';
import {
  isBankAlertSource,
  looksLikeOtpOnlySms,
  looksLikeUpcomingOrMandateSms,
} from './allowlist';

export type SmsTxnDirection = 'credit' | 'debit';

export type ParsedBankSmsDraft = {
  smsId: string;
  sender: string;
  receivedAt: number;
  transactionId: string | null;
  description: string;
  creditAmount: number;
  debitAmount: number;
  financialCategory: 'INCOME' | 'EXPENSE';
  personName?: string | null;
  accountMask?: string | null;
  balance?: number | null;
  notes?: string | null;
  transferType?: string | null;
  transactionDateMs?: number | null;
  rawBody: string;
};

const AMOUNT_NUM =
  '([0-9]{1,3}(?:,[0-9]{2,3})*(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)';

/** Indian Bank / similar: Sent Rs.15.00 from A/c *8179 on 27-07-26 to NAME.RRN 657... */
const SENT_DEBIT_RE = new RegExp(
  `Sent\\s+Rs\\.?\\s*${AMOUNT_NUM}\\s+from\\s+A\\/c\\s*(\\*?\\d{2,})\\s+on\\s+(\\d{2}-\\d{2}-\\d{2})\\s+to\\s+(.+?)\\.\\s*RRN\\s+(\\d{8,})`,
  'i',
);

/** Credit: Your A/c *8179 is credited with Rs.250.00 on 29-07-26 by NAME. RRN ... */
const CREDITED_RE = new RegExp(
  `A\\/c\\s*(\\*?\\d{2,})\\s+is\\s+credited\\s+with\\s+Rs\\.?\\s*${AMOUNT_NUM}\\s+on\\s+(\\d{2}-\\d{2}-\\d{2})\\s+by\\s+(.+?)\\.\\s*RRN\\s+(\\d{8,})`,
  'i',
);

/** Generic amount fallback */
const AMOUNT_RE = new RegExp(`(?:rs\\.?|inr|₹)\\s*${AMOUNT_NUM}`, 'i');

const BALANCE_RE = new RegExp(
  `(?:avl(?:ailable)?\\.?\\s*bal(?:ance)?|available\\s+balance\\s+is|bal(?:ance)?(?:\\s*is)?)[^\\d₹]*?(?:rs\\.?|inr|₹)?\\s*${AMOUNT_NUM}`,
  'i',
);

const ACCOUNT_RE = /(?:a\/c|acct|account)\s*(?:no\.?\s*)?([*xX0-9]{3,})/i;
const RRN_RE = /\bRRN\s+(\d{8,})\b/i;
const DATE_DMY_RE = /\bon\s+(\d{2}-\d{2}-\d{2})\b/i;

function parseAmount(raw: string): number {
  return Number(raw.replace(/,/g, '')) || 0;
}

/** Parse DD-MM-YY (Indian Bank) into epoch ms; returns null if invalid. */
function parseIndianDate(dmy: string, fallbackMs: number): number {
  const m = dmy.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (!m) return fallbackMs;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  let year = Number(m[3]);
  year += year < 70 ? 2000 : 1900;
  const dt = new Date(year, month, day, 12, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? fallbackMs : dt.getTime();
}

function detectDirection(body: string): SmsTxnDirection | null {
  const lower = body.toLowerCase();

  // Credits first — "credited" must win over vague "debit" words in footers
  if (
    /\bis\s+credited\b/i.test(body) ||
    lower.includes('credited with') ||
    lower.includes('has been credited') ||
    /\breceived\s+rs/i.test(body) ||
    lower.includes('deposit of')
  ) {
    return 'credit';
  }

  if (
    /^\s*sent\s+rs/i.test(body) ||
    /\bsent\s+rs\.?\s*\d/i.test(body) ||
    lower.includes('has been debited') ||
    lower.includes('is debited') ||
    /\bdebited\b/i.test(body) ||
    lower.includes('spent on') ||
    lower.includes('paid to') ||
    lower.includes('withdrawn') ||
    lower.includes('purchase of')
  ) {
    return 'debit';
  }

  if (lower.includes('refund') || lower.includes('cashback credited')) {
    return 'credit';
  }

  return null;
}

function detectTransferType(body: string): string | null {
  const upper = body.toUpperCase();
  if (upper.includes('UPI')) return 'UPI';
  if (upper.includes('IMPS')) return 'IMPS';
  if (upper.includes('NEFT')) return 'NEFT';
  if (upper.includes('RTGS')) return 'RTGS';
  if (/\bRRN\b/i.test(body)) return 'IMPS'; // Indian Bank IMPS-style alerts use RRN
  return null;
}

function extractPerson(body: string, direction: SmsTxnDirection): string | null {
  if (direction === 'debit') {
    const to = body.match(/\bto\s+(.+?)(?:\.?\s*RRN\b|\.\s*Avl|\.\s*Not you|$)/i);
    if (to?.[1]) return to[1].replace(/\.$/, '').trim();
  }
  if (direction === 'credit') {
    const by = body.match(/\bby\s+(.+?)(?:\.?\s*RRN\b|\.\s*Available|\.\s*Avl|$)/i);
    if (by?.[1]) return by[1].replace(/\.$/, '').trim();
    const from = body.match(/\bfrom\s+([A-Za-z0-9 .&_-]{2,60}?)(?:\s+on\s|\s+via\s|\.|\s+RRN|$)/i);
    if (from?.[1] && !/^a\/c/i.test(from[1])) return from[1].trim();
  }
  const towards = body.match(/\btowards\s+(.+?)(?:\s+for\s+the\s+Autopay|\.|$)/i);
  if (towards?.[1]) return towards[1].trim();
  return null;
}

function extractRef(body: string): string | null {
  const rrn = body.match(RRN_RE)?.[1];
  if (rrn) return rrn;
  const fromShared = extractStableReference(body);
  if (fromShared) return fromShared;
  return (
    body.match(/(?:UTR|Ref(?:erence)?(?:\s*No)?|Txn(?:\s*ID)?)[:\s#-]*([A-Z0-9]{8,24})/i)?.[1]?.toUpperCase() ||
    null
  );
}

function buildDescription(opts: {
  direction: SmsTxnDirection;
  amount: number;
  person: string | null;
  transferType: string | null;
  ref: string | null;
  sender: string;
}): string {
  const who = opts.person || 'Unknown';
  const channel = opts.transferType || 'BANK';
  const verb = opts.direction === 'debit' ? 'Paid' : 'Received';
  const refPart = opts.ref ? ` /${channel}/${opts.ref}/` : ` via ${channel}`;
  return `${verb} Rs.${opts.amount.toFixed(2)} ${opts.direction === 'debit' ? 'to' : 'from'} ${who}${refPart}`;
}

function draftFromParts(input: {
  id: string;
  address: string;
  body: string;
  date: number;
  direction: SmsTxnDirection;
  amount: number;
  accountMask: string | null;
  personName: string | null;
  ref: string | null;
  balance: number | null;
  txnDateMs: number;
  transferType: string | null;
}): ParsedBankSmsDraft {
  return {
    smsId: input.id,
    sender: input.address,
    receivedAt: input.date,
    transactionId: input.ref,
    description: buildDescription({
      direction: input.direction,
      amount: input.amount,
      person: input.personName,
      transferType: input.transferType,
      ref: input.ref,
      sender: input.address,
    }),
    creditAmount: input.direction === 'credit' ? input.amount : 0,
    debitAmount: input.direction === 'debit' ? input.amount : 0,
    financialCategory: input.direction === 'credit' ? 'INCOME' : 'EXPENSE',
    personName: input.personName,
    accountMask: input.accountMask,
    balance: input.balance,
    notes: null,
    transferType: input.transferType,
    transactionDateMs: input.txnDateMs,
    rawBody: input.body,
  };
}

export function parseBankSms(input: {
  id: string;
  address: string;
  body: string;
  date: number;
}): ParsedBankSmsDraft | null {
  if (!isBankAlertSource(input.address, input.body)) return null;
  if (!input.body?.trim() || looksLikeOtpOnlySms(input.body)) return null;
  // Skip mandate / future autopay notices — not completed txs
  if (looksLikeUpcomingOrMandateSms(input.body)) return null;

  const body = input.body.replace(/\s+/g, ' ').trim();
  const balanceMatch = body.match(BALANCE_RE);
  const balance = balanceMatch?.[1] ? parseAmount(balanceMatch[1]) : null;
  const transferType = detectTransferType(body);

  const sent = body.match(SENT_DEBIT_RE);
  if (sent) {
    const amount = parseAmount(sent[1]);
    if (!(amount > 0)) return null;
    return draftFromParts({
      id: input.id,
      address: input.address,
      body: input.body,
      date: input.date,
      direction: 'debit',
      amount,
      accountMask: sent[2],
      personName: sent[4]?.trim() || null,
      ref: sent[5],
      balance,
      txnDateMs: parseIndianDate(sent[3], input.date),
      transferType: transferType || 'IMPS',
    });
  }

  const credited = body.match(CREDITED_RE);
  if (credited) {
    const amount = parseAmount(credited[2]);
    if (!(amount > 0)) return null;
    return draftFromParts({
      id: input.id,
      address: input.address,
      body: input.body,
      date: input.date,
      direction: 'credit',
      amount,
      accountMask: credited[1],
      personName: credited[4]?.trim() || null,
      ref: credited[5],
      balance,
      txnDateMs: parseIndianDate(credited[3], input.date),
      transferType: transferType || 'IMPS',
    });
  }

  // Generic fallback for other banks
  const amountMatch = body.match(AMOUNT_RE);
  if (!amountMatch?.[1]) return null;
  const amount = parseAmount(amountMatch[1]);
  if (!(amount > 0)) return null;

  const direction = detectDirection(body);
  if (!direction) return null;

  const ref = extractRef(body);
  const accountMask = body.match(ACCOUNT_RE)?.[1] ?? null;
  const personName = extractPerson(body, direction);
  const dateStr = body.match(DATE_DMY_RE)?.[1];
  const txnDateMs = dateStr ? parseIndianDate(dateStr, input.date) : input.date;

  return draftFromParts({
    id: input.id,
    address: input.address,
    body: input.body,
    date: input.date,
    direction,
    amount,
    accountMask,
    personName,
    ref,
    balance,
    txnDateMs,
    transferType,
  });
}
