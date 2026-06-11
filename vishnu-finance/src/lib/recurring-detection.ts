import { prisma } from './db';
import { subDays, differenceInCalendarDays, startOfDay } from 'date-fns';

export type RecurringBillKind = 'mandate' | 'habit';

export interface DetectedRecurringBill {
  merchant: string;
  amount: number;
  occurrences: number;
  frequency: 'monthly' | 'weekly';
  kind: RecurringBillKind;
  lastDate: string;
  categoryName: string | null;
  /** Days since the most recent matching debit */
  daysSinceLast: number;
  /** True when a payment landed within the expected recent window */
  isActiveRecently: boolean;
}

export async function detectRecurringBills(userId: string): Promise<DetectedRecurringBill[]> {
  const since = subDays(new Date(), 90);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      isDeleted: false,
      financialCategory: 'EXPENSE',
      debitAmount: { gt: 0 },
      transactionDate: { gte: since },
    },
    select: {
      id: true,
      debitAmount: true,
      transactionDate: true,
      store: true,
      personName: true,
      description: true,
      category: { select: { name: true } },
    },
    orderBy: { transactionDate: 'desc' },
    take: 500,
  });

  const groups = new Map<
    string,
    {
      merchant: string;
      amounts: number[];
      dates: Date[];
      categoryName: string | null;
    }
  >();

  for (const tx of transactions) {
    const merchant = (tx.store || tx.personName || tx.description || 'Unknown').trim();
    if (!merchant || merchant.length < 2) continue;

    const amount = Number(tx.debitAmount) || 0;
    if (amount < 100) continue;

    const bucket = Math.round(amount / 50) * 50;
    const key = `${merchant.toLowerCase()}|${bucket}`;

    const existing = groups.get(key);
    if (existing) {
      existing.amounts.push(amount);
      existing.dates.push(tx.transactionDate);
    } else {
      groups.set(key, {
        merchant,
        amounts: [amount],
        dates: [tx.transactionDate],
        categoryName: tx.category?.name ?? null,
      });
    }
  }

  const results: DetectedRecurringBill[] = [];

  for (const group of groups.values()) {
    if (group.dates.length < 2) continue;

    const sortedDates = [...group.dates].sort((a, b) => a.getTime() - b.getTime());
    const gaps: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      gaps.push(
        Math.round((sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)),
      );
    }

    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const isMonthly = avgGap >= 25 && avgGap <= 35;
    const isWeekly = avgGap >= 5 && avgGap <= 12;
    if (!isMonthly && !isWeekly) continue;

    const avgAmount = group.amounts.reduce((s, a) => s + a, 0) / group.amounts.length;
    const frequency = isMonthly ? 'monthly' : 'weekly';
    const lastDate = sortedDates[sortedDates.length - 1];
    const today = startOfDay(new Date());
    const daysSinceLast = differenceInCalendarDays(today, startOfDay(lastDate));

    // Only surface patterns still active recently — cancelled subs drop off.
    const recentWindowDays = isMonthly ? 38 : 14;
    if (daysSinceLast > recentWindowDays) continue;

    const recentCutoff = subDays(today, recentWindowDays);
    const recentHits = sortedDates.filter((d) => d >= recentCutoff).length;
    const isActiveRecently = recentHits >= 1;

    // Monthly: require at least one hit in the last ~5 weeks (not just old 90-day history).
    if (isMonthly && !isActiveRecently) continue;
    // Weekly: require a hit in the last 2 weeks.
    if (isWeekly && daysSinceLast > 14) continue;

    results.push({
      merchant: group.merchant,
      amount: Math.round(avgAmount),
      occurrences: group.dates.length,
      frequency,
      kind: isMonthly ? 'mandate' : 'habit',
      lastDate: lastDate.toISOString(),
      categoryName: group.categoryName,
      daysSinceLast,
      isActiveRecently,
    });
  }

  return results.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'mandate' ? -1 : 1;
    return b.amount - a.amount;
  }).slice(0, 20);
}
