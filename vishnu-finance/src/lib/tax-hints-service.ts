import { prisma } from './db';
import { startOfYear } from 'date-fns';

const LIMIT_80C = 150_000;
const LIMIT_80D = 25_000;

const ELSS_KEYWORDS = ['elss', 'tax saver', '80c', 'ppf', 'nps', 'life insurance', 'lic'];
const HEALTH_KEYWORDS = ['health insurance', 'mediclaim', '80d'];

export interface TaxHint {
  section: '80C' | '80D';
  label: string;
  detectedAmount: number;
  limit: number;
  remainingHeadroom: number;
  suggestion: string;
}

export async function computeTaxHints(userId: string): Promise<TaxHint[]> {
  const yearStart = startOfYear(new Date());

  const expenses = await prisma.transaction.findMany({
    where: {
      userId,
      isDeleted: false,
      financialCategory: 'EXPENSE',
      transactionDate: { gte: yearStart },
    },
    select: {
      debitAmount: true,
      description: true,
      store: true,
      category: { select: { name: true } },
    },
    take: 2000,
  });

  let amount80c = 0;
  let amount80d = 0;

  for (const tx of expenses) {
    const amt = Number(tx.debitAmount) || 0;
    if (amt <= 0) continue;
    const haystack = [tx.description, tx.store, tx.category?.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (ELSS_KEYWORDS.some((k) => haystack.includes(k))) {
      amount80c += amt;
    } else if (HEALTH_KEYWORDS.some((k) => haystack.includes(k))) {
      amount80d += amt;
    }
  }

  const hints: TaxHint[] = [];

  hints.push({
    section: '80C',
    label: 'Section 80C (ELSS, PPF, NPS, LIC, etc.)',
    detectedAmount: Math.round(amount80c),
    limit: LIMIT_80C,
    remainingHeadroom: Math.max(0, LIMIT_80C - amount80c),
    suggestion:
      amount80c >= LIMIT_80C
        ? 'You may have fully utilized 80C based on tagged transactions.'
        : `~₹${Math.round(LIMIT_80C - amount80c).toLocaleString('en-IN')} headroom may remain in 80C based on detected payments.`,
  });

  hints.push({
    section: '80D',
    label: 'Section 80D (Health insurance)',
    detectedAmount: Math.round(amount80d),
    limit: LIMIT_80D,
    remainingHeadroom: Math.max(0, LIMIT_80D - amount80d),
    suggestion:
      amount80d >= LIMIT_80D
        ? 'Health insurance payments may meet 80D limits.'
        : 'Consider health insurance premium to use 80D benefits if not already covered.',
  });

  return hints;
}
