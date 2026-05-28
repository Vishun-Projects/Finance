import type { SimpleDashboardData } from '@/types/dashboard';
import type { BucketAdherence, LineItemAdherence, PlanAdherenceResult } from '@/lib/plan-adherence-service';
import { formatRupees } from '@/lib/utils';

export type InsightTone = 'info' | 'warning' | 'success' | 'neutral';

export interface DashboardInsight {
  type: 'pattern' | 'warning' | 'positive';
  message: string;
}

export interface ContextBanner {
  message: string;
  tone: InsightTone;
}

export interface CategoryLegendItem {
  name: string;
  amount: number;
  percent: number;
  color: string;
  href: string;
}

export interface SegmentSplit {
  needs: number;
  wants: number;
  savings: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
}

export interface SpendingContext {
  avgDailySpend: number;
  planDailyBurn: number;
  spentOfPlanPercent: number;
  daysLeftInMonth: number;
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export function getDaysLeftInMonth(date = new Date()): number {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(0, 0, 0, 0);
  const today = new Date(date);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

export function computeSpendingContext(
  stats: SimpleDashboardData['currentMonthStats'],
  plannedTotal: number,
  date = new Date(),
): SpendingContext {
  const dayOfMonth = date.getDate();
  const daysLeftInMonth = getDaysLeftInMonth(date);
  const avgDailySpend = dayOfMonth > 0 ? stats.expenses / dayOfMonth : 0;
  const planDailyBurn = plannedTotal > 0 ? plannedTotal / 30 : 0;
  const spentOfPlanPercent = plannedTotal > 0 ? Math.min(100, (stats.expenses / plannedTotal) * 100) : 0;

  return {
    avgDailySpend,
    planDailyBurn,
    spentOfPlanPercent,
    daysLeftInMonth,
  };
}

export function computeNeedsWantsSavingsSplit(buckets: BucketAdherence[]): SegmentSplit {
  const needs = buckets.find((b) => b.key === 'needs')?.actual ?? 0;
  const wants = buckets.find((b) => b.key === 'wants')?.actual ?? 0;
  const savings =
    (buckets.find((b) => b.key === 'investments')?.actual ?? 0) +
    (buckets.find((b) => b.key === 'insurance')?.actual ?? 0);
  const total = needs + wants + savings || 1;

  return {
    needs,
    wants,
    savings,
    needsPct: Math.round((needs / total) * 100),
    wantsPct: Math.round((wants / total) * 100),
    savingsPct: Math.round((savings / total) * 100),
  };
}

export function getTopCategoriesWithPct(
  categoryBreakdown: SimpleDashboardData['categoryBreakdown'],
  limit = 5,
): CategoryLegendItem[] {
  const total = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0) || 1;

  return categoryBreakdown.slice(0, limit).map((cat, idx) => ({
    name: cat.name,
    amount: cat.amount,
    percent: Math.round((cat.amount / total) * 100),
    color: CHART_COLORS[idx % CHART_COLORS.length],
    href: `/transactions?search=${encodeURIComponent(cat.name)}`,
  }));
}

export function getOverBudgetBuckets(buckets: BucketAdherence[], limit = 4): BucketAdherence[] {
  const priority = { over: 0, warning: 1, on_track: 2 } as const;
  return [...buckets]
    .sort((a, b) => priority[a.status] - priority[b.status] || b.percentUsed - a.percentUsed)
    .slice(0, limit);
}

export function getUnstartedPlanLines(lineItems: LineItemAdherence[], limit = 5): LineItemAdherence[] {
  return lineItems.filter((item) => item.planned > 0 && item.actual === 0).slice(0, limit);
}

export function buildContextBanner(
  stats: SimpleDashboardData['currentMonthStats'],
  incomeBreakdown: SimpleDashboardData['incomeBreakdown'],
  salaryInfo: SimpleDashboardData['salaryInfo'],
  netFlow: number,
): ContextBanner | null {
  const salaryReceived = (incomeBreakdown?.salary ?? 0) > 0;

  if (!salaryReceived && salaryInfo && netFlow < 0) {
    return {
      tone: 'info',
      message: `${new Date().toLocaleString('en-IN', { month: 'long' })} salary not yet received · expected end of month. Negative net flow until then is normal.`,
    };
  }

  if (netFlow < 0 && stats.expenses > stats.income) {
    const gap = stats.expenses - stats.income;
    return {
      tone: 'warning',
      message: `Spending exceeds income by ${formatRupees(gap)} this month. Review over-budget categories below.`,
    };
  }

  if (netFlow > 0) {
    return {
      tone: 'success',
      message: `Positive net flow of ${formatRupees(netFlow)} so far this month.`,
    };
  }

  return null;
}

export function buildDynamicInsights(params: {
  categoryBreakdown: SimpleDashboardData['categoryBreakdown'];
  topPayees: SimpleDashboardData['topPayees'];
  totalExpenses: number;
  monthIncome: number;
  monthExpenses: number;
  monthNet: number;
}): DashboardInsight[] {
  const { categoryBreakdown, topPayees, totalExpenses, monthIncome, monthExpenses, monthNet } = params;
  const insights: DashboardInsight[] = [];

  categoryBreakdown.slice(0, 3).forEach((cat) => {
    if (cat.amount > totalExpenses * 0.3 && totalExpenses > 0) {
      insights.push({
        type: 'warning',
        message: `${cat.name} accounts for ${Math.round((cat.amount / totalExpenses) * 100)}% of spending — worth reviewing.`,
      });
    }
  });

  const topPayee = topPayees[0];
  if (topPayee && topPayee.amount > totalExpenses * 0.15 && totalExpenses > 0) {
    insights.push({
      type: 'pattern',
      message: `Most spending went to ${topPayee.name} (${topPayee.count} transactions).`,
    });
  }

  if (monthNet > 0) {
    const runwayDays = Math.floor(monthNet / (monthExpenses / 30 || 1));
    insights.push({
      type: 'positive',
      message: `You're ahead by ${formatRupees(monthNet)} — roughly ${runwayDays} extra days of runway at current spend.`,
    });
  } else if (monthExpenses > monthIncome && monthIncome > 0) {
    insights.push({
      type: 'warning',
      message: `Expenses are ${Math.round((monthExpenses / monthIncome - 1) * 100)}% above income this month.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'pattern',
      message: 'Spending patterns look typical for this point in the month.',
    });
  }

  return insights.slice(0, 3);
}

export function bucketLineItemHref(label: string): string {
  return `/transactions?lineItem=${encodeURIComponent(label)}`;
}

export type AdvisorInsightsPayload = {
  segmentSplit: SegmentSplit;
  spendingContext: SpendingContext;
  topCategories: CategoryLegendItem[];
  overBudgetBuckets: BucketAdherence[];
  unstartedLines: LineItemAdherence[];
  monthlyTrends: SimpleDashboardData['monthlyTrends'];
  dynamicInsights: DashboardInsight[];
  adherence: Pick<
    PlanAdherenceResult,
    'plannedTotal' | 'actualTotal' | 'overallScore' | 'monthLabel'
  >;
};
