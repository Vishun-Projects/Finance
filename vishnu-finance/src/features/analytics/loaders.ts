import { prisma } from '@/lib/db';
import { format, addMonths, startOfMonth, differenceInCalendarDays, endOfDay, startOfDay, subDays } from 'date-fns';
import { getTransactionDisplayName } from '@/lib/transaction-utils';
import type {
  AnalyticsBootstrap,
  AnalyticsCategoryPoint,
  AnalyticsGoalProjection,
  AnalyticsMonthPoint,
  AnalyticsPeriodPreset,
  AnalyticsRange,
} from './types';

function toJson<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return format(new Date(y, m - 1, 1), 'MMM yy');
}

function classifyIncomeBucket(categoryName: string | null | undefined): 'salary' | 'family' | 'friends' | 'other' {
  const n = (categoryName || '').toLowerCase();
  if (!n) return 'other';
  if (
    n.includes('salary') ||
    n === 'income' ||
    n === 'bonus' ||
    n.includes('freelance') ||
    n === 'business'
  ) {
    return 'salary';
  }
  if (n.includes('family')) return 'family';
  if (n.includes('friend') || n.includes('social')) return 'friends';
  return 'other';
}

function buildCategoryPoints(
  totals: Map<string, number>,
  grandTotal: number,
  limit = 12,
): AnalyticsCategoryPoint[] {
  return Array.from(totals.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

function safePctChange(base: number, next: number): number {
  if (base <= 0) return next > 0 ? 100 : 0;
  return ((next - base) / base) * 100;
}

function pearson(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (!Number.isFinite(den) || den === 0) return 0;
  const r = num / den;
  return Number.isFinite(r) ? Math.max(-1, Math.min(1, r)) : 0;
}

interface LoaderRangeInput {
  preset?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveAnalyticsRange(input?: LoaderRangeInput): AnalyticsRange {
  const today = new Date();
  const requestedPreset = (input?.preset || 'all').toLowerCase();
  const preset = ['7d', '30d', '90d', '1y', 'all', 'custom'].includes(requestedPreset)
    ? (requestedPreset as AnalyticsPeriodPreset)
    : 'all';

  if (preset === 'custom') {
    const start = parseDateInput(input?.startDate);
    const end = parseDateInput(input?.endDate);
    if (!start || !end || start > end) {
      return { preset: 'all', startDate: null, endDate: null };
    }
    return {
      preset,
      startDate: format(startOfDay(start), 'yyyy-MM-dd'),
      endDate: format(endOfDay(end), 'yyyy-MM-dd'),
    };
  }

  if (preset === 'all') {
    return { preset, startDate: null, endDate: null };
  }

  const durationDays = preset === '7d' ? 6 : preset === '30d' ? 29 : preset === '90d' ? 89 : 364;
  const end = endOfDay(today);
  const start = startOfDay(subDays(end, durationDays));
  return {
    preset,
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  };
}

function pctDelta(current: number, previous: number | null): number | null {
  if (previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round((((current - previous) / Math.abs(previous)) * 100) * 10) / 10;
}

async function loadAnalyticsCore(
  userId: string,
  range: AnalyticsRange,
): Promise<Omit<AnalyticsBootstrap, 'kpis' | 'range'>> {
  const dateWhere =
    range.startDate && range.endDate
      ? {
          gte: startOfDay(new Date(range.startDate)),
          lte: endOfDay(new Date(range.endDate)),
        }
      : undefined;

  const [
    transactions,
    goals,
    salaryHistory,
    bankStatement,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, isDeleted: false, ...(dateWhere ? { transactionDate: dateWhere } : {}) },
      select: {
        transactionDate: true,
        creditAmount: true,
        debitAmount: true,
        financialCategory: true,
        description: true,
        personName: true,
        store: true,
        upiId: true,
        category: { select: { name: true } },
      },
      orderBy: { transactionDate: 'asc' },
    }),
    prisma.goal.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        targetAmount: true,
        currentAmount: true,
        targetDate: true,
      },
    }),
    (prisma as any).salaryHistory.findMany({
      where: { userId },
      orderBy: { effectiveDate: 'asc' },
      select: {
        effectiveDate: true,
        baseSalary: true,
      },
    }),
    prisma.accountStatement.findFirst({
      where: { userId },
      orderBy: { statementEndDate: 'desc' },
      select: { closingBalance: true },
    }),
  ]);

  const monthly = new Map<string, { income: number; expenses: number }>();
  const monthlyCategoryExpense = new Map<string, Map<string, number>>();
  const expenseCats = new Map<string, number>();
  const incomeCats = new Map<string, number>();
  const payees = new Map<string, { amount: number; count: number }>();
  const weekday = new Map<number, { amount: number; count: number }>();
  const incomeBreakdown = { salary: 0, family: 0, friends: 0, other: 0, total: 0 };

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const t of transactions) {
    const ym = format(t.transactionDate, 'yyyy-MM');
    const bucket = monthly.get(ym) || { income: 0, expenses: 0 };
    const credit = Number(t.creditAmount) || 0;
    const debit = Number(t.debitAmount) || 0;
    const catName = t.category?.name || 'Uncategorized';

    if (t.financialCategory === 'INCOME' && credit > 0) {
      bucket.income += credit;
      totalIncome += credit;
      incomeCats.set(catName, (incomeCats.get(catName) || 0) + credit);
      const ib = classifyIncomeBucket(catName);
      incomeBreakdown[ib] += credit;
      incomeBreakdown.total += credit;
    } else if (t.financialCategory === 'EXPENSE' && debit > 0) {
      bucket.expenses += debit;
      totalExpenses += debit;
      expenseCats.set(catName, (expenseCats.get(catName) || 0) + debit);
      if (!monthlyCategoryExpense.has(ym)) monthlyCategoryExpense.set(ym, new Map());
      const monthCat = monthlyCategoryExpense.get(ym)!;
      monthCat.set(catName, (monthCat.get(catName) || 0) + debit);

      const payee = getTransactionDisplayName({
        description: t.description,
        personName: t.personName,
        store: t.store,
      }).trim() || 'Unknown';
      const p = payees.get(payee) || { amount: 0, count: 0 };
      p.amount += debit;
      p.count += 1;
      payees.set(payee, p);

      const dow = t.transactionDate.getDay();
      const w = weekday.get(dow) || { amount: 0, count: 0 };
      w.amount += debit;
      w.count += 1;
      weekday.set(dow, w);
    }

    monthly.set(ym, bucket);
  }

  const months: AnalyticsMonthPoint[] = Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      const savings = data.income - data.expenses;
      const savingsRate = data.income > 0 ? (savings / data.income) * 100 : 0;
      return {
        month,
        label: monthLabel(month),
        income: Math.round(data.income * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        savings: Math.round(savings * 100) / 100,
        savingsRate: Math.round(savingsRate * 10) / 10,
      };
    });

  const monthsCount = Math.max(months.length, 1);
  const avgMonthlyIncome = totalIncome / monthsCount;
  const avgMonthlyExpenses = totalExpenses / monthsCount;
  const avgMonthlySavings = avgMonthlyIncome - avgMonthlyExpenses;
  const avgSavingsRate = avgMonthlyIncome > 0 ? (avgMonthlySavings / avgMonthlyIncome) * 100 : 0;

  // Use last 6 months for projection pace (more reflective of "current ways")
  const recent = months.slice(-6);
  const recentAvgSavings =
    recent.length > 0
      ? recent.reduce((s, m) => s + m.savings, 0) / recent.length
      : avgMonthlySavings;

  const now = new Date();
  const goalProjections: AnalyticsGoalProjection[] = goals.map((g) => {
    const targetAmount = Number(g.targetAmount) || 0;
    const currentAmount = Number(g.currentAmount) || 0;
    const remaining = Math.max(0, targetAmount - currentAmount);
    const progressPct = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    const targetDate = g.targetDate ? new Date(g.targetDate) : null;

    let monthsToGoal: number | null = null;
    let projectedDate: string | null = null;
    let reachable = false;
    let onTrack: boolean | null = null;
    let note = '';

    if (remaining <= 0) {
      monthsToGoal = 0;
      projectedDate = format(now, 'yyyy-MM-dd');
      reachable = true;
      onTrack = true;
      note = 'Goal already reached';
    } else if (recentAvgSavings <= 0) {
      reachable = false;
      onTrack = targetDate ? false : null;
      note = 'Current pace is not saving — goal will not be reached unless spending drops or income rises';
    } else {
      monthsToGoal = Math.ceil(remaining / recentAvgSavings);
      const proj = addMonths(startOfMonth(now), monthsToGoal);
      projectedDate = format(proj, 'yyyy-MM-dd');
      reachable = true;
      if (targetDate) {
        onTrack = proj <= targetDate;
        note = onTrack
          ? `On track — reach ~${format(proj, 'MMM yyyy')} before target ${format(targetDate, 'MMM yyyy')}`
          : `Behind — reach ~${format(proj, 'MMM yyyy')}, after target ${format(targetDate, 'MMM yyyy')}`;
      } else {
        note = `At current pace (~₹${Math.round(recentAvgSavings).toLocaleString('en-IN')}/mo), ~${monthsToGoal} months`;
      }
    }

    return {
      id: g.id,
      title: g.title,
      targetAmount,
      currentAmount,
      remaining,
      progressPct: Math.round(progressPct * 10) / 10,
      targetDate: targetDate ? format(targetDate, 'yyyy-MM-dd') : null,
      avgMonthlySavings: Math.round(recentAvgSavings * 100) / 100,
      monthsToGoal,
      projectedDate,
      onTrack,
      reachable,
      note,
    };
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdaySpend = dayNames.map((day, i) => {
    const w = weekday.get(i) || { amount: 0, count: 0 };
    return {
      day,
      amount: Math.round(w.amount * 100) / 100,
      count: w.count,
    };
  });

  const topPayees = Array.from(payees.entries())
    .map(([name, v]) => ({ name, amount: Math.round(v.amount * 100) / 100, count: v.count }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Pattern intelligence: growth + concentration + flexible/luxury candidates.
  const monthLabels = months.map((m) => m.month);
  const split = Math.max(1, Math.floor(months.length / 2));
  const baselineMonths = months.slice(0, split);
  const recentMonths = months.slice(-split);
  const baselineAvgExpense =
    baselineMonths.length > 0
      ? baselineMonths.reduce((s, m) => s + m.expenses, 0) / baselineMonths.length
      : 0;
  const recentAvgExpense =
    recentMonths.length > 0
      ? recentMonths.reduce((s, m) => s + m.expenses, 0) / recentMonths.length
      : 0;
  const baselineAvgIncome =
    baselineMonths.length > 0
      ? baselineMonths.reduce((s, m) => s + m.income, 0) / baselineMonths.length
      : 0;
  const recentAvgIncome =
    recentMonths.length > 0
      ? recentMonths.reduce((s, m) => s + m.income, 0) / recentMonths.length
      : 0;

  const spendGrowthPct = safePctChange(baselineAvgExpense, recentAvgExpense);
  const incomeGrowthPct = safePctChange(baselineAvgIncome, recentAvgIncome);
  const expenseIncomeCorrelation = pearson(
    months.map((m) => m.income),
    months.map((m) => m.expenses),
  );

  const catSeries = new Map<string, number[]>();
  for (const month of monthLabels) {
    const m = monthlyCategoryExpense.get(month) || new Map<string, number>();
    const seen = new Set<string>();
    m.forEach((v, cat) => {
      if (!catSeries.has(cat)) catSeries.set(cat, Array(monthLabels.length).fill(0));
      const arr = catSeries.get(cat)!;
      const idx = monthLabels.indexOf(month);
      arr[idx] = v;
      seen.add(cat);
    });
    // existing categories already defaulted as 0 by initialized arrays
    catSeries.forEach((arr, cat) => {
      if (!seen.has(cat)) {
        const idx = monthLabels.indexOf(month);
        if (arr[idx] == null) arr[idx] = 0;
      }
    });
  }

  const monthIncomeSeries = months.map((m) => m.income);
  const topFlexibleCategories = Array.from(catSeries.entries())
    .map(([name, series]) => {
      const base = series.slice(0, split);
      const recent = series.slice(-split);
      const baseAvg = base.length ? base.reduce((s, v) => s + v, 0) / base.length : 0;
      const recentAvg = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : 0;
      const increase = recentAvg - baseAvg;
      const increasePct = safePctChange(baseAvg, recentAvg);
      const total = series.reduce((s, v) => s + v, 0);
      const shareOfExpense = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
      const incomeSensitivity = pearson(monthIncomeSeries, series);
      const mean = total / Math.max(series.length, 1);
      const variance =
        series.length > 0
          ? series.reduce((s, v) => s + (v - mean) * (v - mean), 0) / series.length
          : 0;
      const std = Math.sqrt(Math.max(0, variance));
      const variability = mean > 0 ? std / mean : 0;
      // score aims to surface flexible/lifestyle-sensitive categories:
      // high positive growth + meaningful share + sensitivity to higher-income months + variable behavior.
      const flexibleScore =
        Math.max(0, increasePct) * 0.45 +
        Math.max(0, shareOfExpense) * 0.25 +
        Math.max(0, incomeSensitivity) * 100 * 0.2 +
        Math.max(0, variability) * 100 * 0.1;

      return {
        name,
        baselineAvg: Math.round(baseAvg * 100) / 100,
        recentAvg: Math.round(recentAvg * 100) / 100,
        increase: Math.round(increase * 100) / 100,
        increasePct: Math.round(increasePct * 10) / 10,
        shareOfExpense: Math.round(shareOfExpense * 10) / 10,
        incomeSensitivity: Math.round(incomeSensitivity * 100) / 100,
        variability: Math.round(variability * 100) / 100,
        flexibleScore: Math.round(flexibleScore * 10) / 10,
      };
    })
    .filter((c) => c.recentAvg > 0 || c.baselineAvg > 0)
    .sort((a, b) => b.flexibleScore - a.flexibleScore)
    .slice(0, 8);

  const spendConcentrationPct = Math.round(
    topFlexibleCategories.slice(0, 3).reduce((s, c) => s + c.shareOfExpense, 0) * 10,
  ) / 10;

  const salaryPoints = (salaryHistory as Array<{
    effectiveDate: Date;
    baseSalary: unknown;
  }>).map((h) => ({
    date: format(new Date(h.effectiveDate), 'yyyy-MM-dd'),
    label: format(new Date(h.effectiveDate), 'MMM yy'),
    takeHome: Number(h.baseSalary) || 0,
    ctc: 0,
  }));

  const first = transactions[0]?.transactionDate ?? null;
  const last = transactions[transactions.length - 1]?.transactionDate ?? null;

  return toJson({
    months,
    expenseCategories: buildCategoryPoints(expenseCats, totalExpenses),
    incomeCategories: buildCategoryPoints(incomeCats, totalIncome, 8),
    incomeBreakdown: {
      salary: Math.round(incomeBreakdown.salary * 100) / 100,
      family: Math.round(incomeBreakdown.family * 100) / 100,
      friends: Math.round(incomeBreakdown.friends * 100) / 100,
      other: Math.round(incomeBreakdown.other * 100) / 100,
      total: Math.round(incomeBreakdown.total * 100) / 100,
    },
    salaryHistory: salaryPoints,
    goals: goalProjections,
    topPayees,
    weekdaySpend,
    patternInsights: {
      spendGrowthPct: Math.round(spendGrowthPct * 10) / 10,
      incomeGrowthPct: Math.round(incomeGrowthPct * 10) / 10,
      expenseIncomeCorrelation: Math.round(expenseIncomeCorrelation * 100) / 100,
      recentAverageExpense: Math.round(recentAvgExpense * 100) / 100,
      baselineAverageExpense: Math.round(baselineAvgExpense * 100) / 100,
      spendConcentrationPct,
      topFlexibleCategories,
    },
    summary: {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netSavings: Math.round((totalIncome - totalExpenses) * 100) / 100,
      avgMonthlyIncome: Math.round(avgMonthlyIncome * 100) / 100,
      avgMonthlyExpenses: Math.round(avgMonthlyExpenses * 100) / 100,
      avgMonthlySavings: Math.round(avgMonthlySavings * 100) / 100,
      avgSavingsRate: Math.round(avgSavingsRate * 10) / 10,
      txnCount: transactions.length,
      firstDate: first ? format(first, 'yyyy-MM-dd') : null,
      lastDate: last ? format(last, 'yyyy-MM-dd') : null,
      bankBalance: bankStatement?.closingBalance ? Number(bankStatement.closingBalance) : 0,
    },
  } satisfies Omit<AnalyticsBootstrap, 'kpis' | 'range'>);
}

export async function loadAnalyticsBootstrap(
  userId: string,
  input?: LoaderRangeInput,
): Promise<AnalyticsBootstrap> {
  const range = resolveAnalyticsRange(input);
  const current = await loadAnalyticsCore(userId, range);

  let prevNetSavings: number | null = null;
  let prevAvgMonthlySavings: number | null = null;
  let prevBankBalance: number | null = null;

  if (range.startDate && range.endDate) {
    const start = startOfDay(new Date(range.startDate));
    const end = endOfDay(new Date(range.endDate));
    const periodDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
    const prevEnd = endOfDay(subDays(start, 1));
    const prevStart = startOfDay(subDays(prevEnd, periodDays - 1));
    const previousRange: AnalyticsRange = {
      preset: 'custom',
      startDate: format(prevStart, 'yyyy-MM-dd'),
      endDate: format(prevEnd, 'yyyy-MM-dd'),
    };
    const previous = await loadAnalyticsCore(userId, previousRange);
    prevNetSavings = previous.summary.netSavings;
    prevAvgMonthlySavings = previous.summary.avgMonthlySavings;
    prevBankBalance = previous.summary.bankBalance;
  }

  const balanceTrendSeed = current.months.length > 0 ? current.months : [{ month: '', label: '', income: 0, expenses: 0, savings: 0, savingsRate: 0 }];
  const balanceTrend = balanceTrendSeed.reduce<number[]>((acc, m) => {
    const previousValue = acc.length > 0 ? acc[acc.length - 1] : current.summary.bankBalance - m.savings;
    acc.push(Math.round((previousValue + m.savings) * 100) / 100);
    return acc;
  }, []);

  return {
    ...current,
    kpis: {
      netSaved: {
        value: current.summary.netSavings,
        deltaPct: pctDelta(current.summary.netSavings, prevNetSavings),
        trend: current.months.map((m) => m.savings),
      },
      avgMonthlySaved: {
        value: current.summary.avgMonthlySavings,
        deltaPct: pctDelta(current.summary.avgMonthlySavings, prevAvgMonthlySavings),
        trend: current.months.map((m) => m.savings),
      },
      bankBalance: {
        value: current.summary.bankBalance,
        deltaPct: pctDelta(current.summary.bankBalance, prevBankBalance),
        trend: balanceTrend,
      },
    },
    range,
  };
}
