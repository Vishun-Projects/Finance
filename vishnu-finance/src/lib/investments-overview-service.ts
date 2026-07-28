import { subMonths } from 'date-fns';
import { prisma } from './db';
import { computeNetWorth } from './net-worth-service';

/** Broker / instrument tokens — matched as whole words (never substrings like "nse" in "Expenses"). */
const INVESTMENT_KEYWORDS = [
  'sip',
  'zerodha',
  'groww',
  'upstox',
  'mutual fund',
  'elss',
  'camsonline',
  'kfintech',
  'paytm money',
  'coin by zerodha',
  'ppf',
  'nps',
  'axis mf',
  'hdfc mf',
  'icici prudential',
  'sbi mf',
  'franklin',
  'demat',
  'cdsl',
  'nsdl',
];

/** Short exchange codes — only count as whole tokens in bank narration. */
const EXCHANGE_TOKENS = ['nse', 'bse', 'mf'];

export interface InvestmentActivityRow {
  label: string;
  totalAmount: number;
  transactionCount: number;
  lastDate: string;
  source: 'bank_txn' | 'manual_asset';
}

export interface InvestmentMonthPoint {
  monthKey: string;
  label: string;
  amount: number;
  count: number;
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
  monthlyTrend: InvestmentMonthPoint[];
  hasData: boolean;
}

/** Bank narration only — category names like "Other Expenses" must not drive keyword hits. */
function narration(tx: {
  description: string | null;
  store: string | null;
  personName: string | null;
}): string {
  return [tx.description, tx.store, tx.personName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function includesToken(haystack: string, token: string): boolean {
  const t = token.trim().toLowerCase();
  if (!t) return false;
  if (t.includes(' ')) return haystack.includes(t);
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(haystack);
}

function isInvestmentTransaction(tx: {
  financialCategory: string;
  debitAmount: unknown;
  description: string | null;
  store: string | null;
  personName: string | null;
}): boolean {
  const amount = Number(tx.debitAmount) || 0;
  if (amount <= 0) return false;
  if (tx.financialCategory === 'INVESTMENT') return true;
  const text = narration(tx);
  if (INVESTMENT_KEYWORDS.some((k) => includesToken(text, k))) return true;
  return EXCHANGE_TOKENS.some((k) => includesToken(text, k));
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

  const monthMap = new Map<string, { amount: number; count: number }>();
  for (const tx of investmentTxns) {
    const d = tx.transactionDate;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cur = monthMap.get(key) ?? { amount: 0, count: 0 };
    cur.amount += Number(tx.debitAmount) || 0;
    cur.count += 1;
    monthMap.set(key, cur);
  }

  const monthlyTrend: InvestmentMonthPoint[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const point = monthMap.get(key) ?? { amount: 0, count: 0 };
    monthlyTrend.push({
      monthKey: key,
      label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      amount: Math.round(point.amount),
      count: point.count,
    });
  }

  const monthsWithData = Math.max(1, monthlyTrend.filter((m) => m.amount > 0).length);
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
    monthlyTrend,
    hasData: activity.length > 0,
  };
}
