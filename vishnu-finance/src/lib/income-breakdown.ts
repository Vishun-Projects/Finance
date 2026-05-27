export interface IncomeBreakdown {
  salary: number;
  family: number;
  other: number;
  total: number;
}

export interface IncomeTransactionInput {
  creditAmount: number;
  categoryName?: string | null;
  description?: string | null;
  personName?: string | null;
  store?: string | null;
}

const SALARY_CATEGORY_PATTERNS = ['salary', 'payroll', 'wages'];
const FAMILY_CATEGORY_PATTERNS = [
  'gifts & donations',
  'gift',
  'family',
  'transfer',
];
const FAMILY_TEXT_PATTERNS = [
  'papa',
  'father',
  'mummy',
  'mother',
  'mom',
  'dad',
  'parent',
  'mamta',
  'munsheelal',
];

function textBlob(tx: IncomeTransactionInput): string {
  return `${tx.categoryName || ''} ${tx.description || ''} ${tx.personName || ''} ${tx.store || ''}`.toLowerCase();
}

export function classifyIncomeBucket(tx: IncomeTransactionInput): keyof Omit<IncomeBreakdown, 'total'> {
  const amount = Number(tx.creditAmount) || 0;
  if (amount <= 0) return 'other';

  const category = (tx.categoryName || '').trim().toLowerCase();
  const text = textBlob(tx);

  if (SALARY_CATEGORY_PATTERNS.some((p) => category.includes(p) || text.includes(p))) {
    return 'salary';
  }

  if (
    FAMILY_CATEGORY_PATTERNS.some((p) => category.includes(p))
    || FAMILY_TEXT_PATTERNS.some((p) => text.includes(p))
  ) {
    return 'family';
  }

  return 'other';
}

export function computeIncomeBreakdown(transactions: IncomeTransactionInput[]): IncomeBreakdown {
  const breakdown: IncomeBreakdown = { salary: 0, family: 0, other: 0, total: 0 };

  for (const tx of transactions) {
    const amount = Number(tx.creditAmount) || 0;
    if (amount <= 0) continue;
    breakdown[classifyIncomeBucket(tx)] += amount;
    breakdown.total += amount;
  }

  return breakdown;
}
