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
const SALARY_TEXT_PATTERNS = [
  'salary',
  'payroll',
  'wages',
  'neft cr',
  'neft credit',
  'imps cr',
  'rtgs cr',
  'credited',
  'pay cheque',
  'paycheck',
  'stipend',
  'ctc',
  'employer',
];
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

  if (SALARY_TEXT_PATTERNS.some((p) => text.includes(p))) {
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

function isFamilyCredit(tx: IncomeTransactionInput): boolean {
  const category = (tx.categoryName || '').trim().toLowerCase();
  const text = textBlob(tx);
  return (
    FAMILY_CATEGORY_PATTERNS.some((p) => category.includes(p))
    || FAMILY_TEXT_PATTERNS.some((p) => text.includes(p))
  );
}

function looksLikeSalaryCredit(tx: IncomeTransactionInput): boolean {
  const category = (tx.categoryName || '').trim().toLowerCase();
  const text = textBlob(tx);
  return (
    SALARY_CATEGORY_PATTERNS.some((p) => category.includes(p) || text.includes(p))
    || SALARY_TEXT_PATTERNS.some((p) => text.includes(p))
  );
}

/** Salary credits for plan capacity — includes partial payments not tagged as Salary. */
export function computeSalaryCredits(
  transactions: IncomeTransactionInput[],
  options?: { activeMonthlyTakeHome?: number | null },
): number {
  const breakdown = computeIncomeBreakdown(transactions);
  if (breakdown.salary > 0) return breakdown.salary;

  const activeMonthly = Number(options?.activeMonthlyTakeHome) || 0;
  let salaryLikeTotal = 0;

  for (const tx of transactions) {
    const amount = Number(tx.creditAmount) || 0;
    if (amount <= 0 || isFamilyCredit(tx)) continue;

    const matchesActiveBand =
      activeMonthly > 0 && amount >= activeMonthly * 0.12 && amount <= activeMonthly * 1.15;

    if (looksLikeSalaryCredit(tx) || matchesActiveBand) {
      salaryLikeTotal += amount;
    }
  }

  if (salaryLikeTotal > 0) return salaryLikeTotal;

  const nonFamilyCredits = transactions
    .map((tx) => ({ tx, amount: Number(tx.creditAmount) || 0 }))
    .filter(({ amount, tx }) => amount >= 5000 && !isFamilyCredit(tx))
    .sort((a, b) => b.amount - a.amount);

  if (nonFamilyCredits.length === 0) return 0;

  const largest = nonFamilyCredits[0];
  if (activeMonthly > 0 && largest.amount >= activeMonthly * 0.12) {
    return largest.amount;
  }

  if (largest.amount >= 10000) {
    return largest.amount;
  }

  return 0;
}
