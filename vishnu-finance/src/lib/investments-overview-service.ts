import { subMonths } from 'date-fns';
import { prisma } from './db';
import { computeNetWorth } from './net-worth-service';

const INVESTMENT_KEYWORDS = [
  'sip',
  'zerodha',
  'groww',
  'upstox',
  'mutual fund',
  'mf ',
  'elss',
  'camsonline',
  'cams ',
  'kfintech',
  'paytm money',
  'coin by',
  'bse',
  'nse',
  'ppf',
  'nps',
  'lic ',
  'axis mf',
  'hdfc mf',
  'icici prudential',
  'sbi mf',
  'franklin',
  'investment',
];

export interface InvestmentActivityRow {
  label: string;
  totalAmount: number;
  transactionCount: number;
  lastDate: string;
  source: 'bank_txn' | 'manual_asset';
}

export interface InvestmentsOverview {
  summary: {
    investedThisYear: number;
    avgMonthlySip: number;
    investmentTransactionCount: number;
    manualInvestmentAssets: number;
    lastInvestmentDate: string | null;
  };
  activity: InvestmentActivityRow[];
  hasData: boolean;
}

function haystack(tx: {
  description: string | null;
  store: string | null;
  personName: string | null;
  category: { name: string } | null;
}): string {
  return [tx.description, tx.store, tx.personName, tx.category?.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isInvestmentTransaction(tx: {
  financialCategory: string;
  debitAmount: unknown;
  description: string | null;
  store: string | null;
  personName: string | null;
  category: { name: string } | null;
}): boolean {
  const amount = Number(tx.debitAmount) || 0;
  if (amount <= 0) return false;
  if (tx.financialCategory === 'INVESTMENT') return true;
  const text = haystack(tx);
  return INVESTMENT_KEYWORDS.some((k) => text.includes(k));
}

function activityLabel(tx: {
  description: string | null;
  store: string | null;
  personName: string | null;
}): string {
  return (tx.store || tx.personName || tx.description || 'Investment').trim().slice(0, 80);
}

export async function getInvestmentsOverview(userId: string): Promise<InvestmentsOverview> {
  const since = subMonths(new Date(), 12);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [transactions, netWorth] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        isDeleted: false,
        transactionDate: { gte: since },
        OR: [
          { financialCategory: 'INVESTMENT' },
          { financialCategory: 'EXPENSE' },
        ],
      },
      select: {
        debitAmount: true,
        transactionDate: true,
        description: true,
        store: true,
        personName: true,
        financialCategory: true,
        category: { select: { name: true } },
      },
      orderBy: { transactionDate: 'desc' },
      take: 2000,
    }),
    computeNetWorth(userId).catch(() => null),
  ]);

  const investmentTxns = transactions.filter(isInvestmentTransaction);

  const groups = new Map<string, InvestmentActivityRow>();
  let investedThisYear = 0;
  let lastInvestmentDate: Date | null = null;

  for (const tx of investmentTxns) {
    const amount = Number(tx.debitAmount) || 0;
    const label = activityLabel(tx);
    const key = label.toLowerCase();

    const existing = groups.get(key);
    if (existing) {
      existing.totalAmount += amount;
      existing.transactionCount += 1;
      if (tx.transactionDate.toISOString() > existing.lastDate) {
        existing.lastDate = tx.transactionDate.toISOString();
      }
    } else {
      groups.set(key, {
        label,
        totalAmount: amount,
        transactionCount: 1,
        lastDate: tx.transactionDate.toISOString(),
        source: 'bank_txn',
      });
    }

    if (tx.transactionDate >= yearStart) {
      investedThisYear += amount;
    }
    if (!lastInvestmentDate || tx.transactionDate > lastInvestmentDate) {
      lastInvestmentDate = tx.transactionDate;
    }
  }

  const manualAssets =
    netWorth?.assets.filter((a) => a.type === 'INVESTMENT') ?? [];
  const manualInvestmentAssets = manualAssets.reduce((s, a) => s + a.value, 0);

  for (const asset of manualAssets) {
    groups.set(`asset:${asset.id}`, {
      label: asset.name,
      totalAmount: asset.value,
      transactionCount: 1,
      lastDate: asset.asOfDate,
      source: 'manual_asset',
    });
  }

  const activity = [...groups.values()].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 20);

  const monthsWithData = Math.max(1, Math.min(12, investmentTxns.length > 0 ? 12 : 1));
  const total12m = investmentTxns.reduce((s, t) => s + (Number(t.debitAmount) || 0), 0);

  return {
    summary: {
      investedThisYear: Math.round(investedThisYear),
      avgMonthlySip: Math.round(total12m / monthsWithData),
      investmentTransactionCount: investmentTxns.length,
      manualInvestmentAssets: Math.round(manualInvestmentAssets),
      lastInvestmentDate: lastInvestmentDate?.toISOString() ?? null,
    },
    activity,
    hasData: activity.length > 0,
  };
}
