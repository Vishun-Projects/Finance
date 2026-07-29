import { extractStableReference } from '@/lib/import-dedup-refs';
import { isIndianBankSmsSender, looksLikeOtpOnlySms } from './allowlist';

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
  rawBody: string;
};

const AMOUNT_RE =
  /(?:rs\.?|inr|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;
const BALANCE_RE =
  /(?:avl(?:ailable)?\.?\s*bal(?:ance)?|bal(?:ance)?(?:\s*is)?|a\/c\s*bal)[^\d₹]*?(?:rs\.?|inr|₹)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;
const ACCOUNT_RE = /(?:a\/c|acct|account|xx+)\s*(?:no\.?\s*)?([xX*0-9]{4,})/i;
const TO_FROM_RE =
  /(?:to|from|at|towards)\s+([A-Za-z0-9 .&_-]{2,40}?)(?:\s+on\s|\s+via\s|\s+upi|\s+ref|\s+info|\.|$)/i;

function parseAmount(raw: string): number {
  return Number(raw.replace(/,/g, '')) || 0;
}

function detectDirection(body: string): SmsTxnDirection | null {
  const lower = body.toLowerCase();
  if (
    lower.includes('debited') ||
    lower.includes('spent') ||
    lower.includes('paid to') ||
    lower.includes('withdrawn') ||
    lower.includes('purchase')
  ) {
    return 'debit';
  }
  if (
    lower.includes('credited') ||
    lower.includes('received') ||
    lower.includes('deposit') ||
    lower.includes('refund')
  ) {
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
  return null;
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
  return `${verb} Rs.${opts.amount.toFixed(2)} ${opts.direction === 'debit' ? 'to' : 'from'} ${who}${refPart} (${opts.sender})`;
}

export function parseBankSms(input: {
  id: string;
  address: string;
  body: string;
  date: number;
}): ParsedBankSmsDraft | null {
  if (!isIndianBankSmsSender(input.address)) return null;
  if (!input.body?.trim() || looksLikeOtpOnlySms(input.body)) return null;

  const amountMatch = input.body.match(AMOUNT_RE);
  if (!amountMatch?.[1]) return null;

  const amount = parseAmount(amountMatch[1]);
  if (!(amount > 0)) return null;

  const direction = detectDirection(input.body);
  if (!direction) return null;

  const ref =
    extractStableReference(input.body) ||
    input.body.match(/(?:UTR|Ref(?:erence)?(?:\s*No)?|Txn(?:\s*ID)?)[:\s#-]*([A-Z0-9]{8,24})/i)?.[1]?.toUpperCase() ||
    null;

  const balanceMatch = input.body.match(BALANCE_RE);
  const balance = balanceMatch?.[1] ? parseAmount(balanceMatch[1]) : null;
  const accountMask = input.body.match(ACCOUNT_RE)?.[1] ?? null;
  const personName = input.body.match(TO_FROM_RE)?.[1]?.trim() ?? null;
  const transferType = detectTransferType(input.body);

  const creditAmount = direction === 'credit' ? amount : 0;
  const debitAmount = direction === 'debit' ? amount : 0;

  return {
    smsId: input.id,
    sender: input.address,
    receivedAt: input.date,
    transactionId: ref,
    description: buildDescription({
      direction,
      amount,
      person: personName,
      transferType,
      ref,
      sender: input.address,
    }),
    creditAmount,
    debitAmount,
    financialCategory: direction === 'credit' ? 'INCOME' : 'EXPENSE',
    personName,
    accountMask,
    balance,
    notes: null,
    transferType,
    rawBody: input.body,
  };
}
