import { loadDashboardCached } from '@/lib/server-data-cache';
import {
  buildDynamicInsights,
  computeNeedsWantsSavingsSplit,
  computeSpendingContext,
  getTopCategoriesWithPct,
  getUnstartedPlanLines,
  type AdvisorInsightsPayload,
} from '@/lib/dashboard-insights';

export async function loadAdvisorInsights(userId: string): Promise<AdvisorInsightsPayload> {
  const dashboard = await loadDashboardCached(userId);
  const { stats, adherence, disciplineSummary } = dashboard;

  const segmentSplit = computeNeedsWantsSavingsSplit(adherence.buckets);
  const spendingContext = computeSpendingContext(stats.currentMonthStats, adherence.plannedTotal);
  const topCategories = getTopCategoriesWithPct(stats.categoryBreakdown ?? [], 6);
  const overBudgetBuckets = adherence.buckets.filter((b) => b.status === 'over');
  const unstartedLines = getUnstartedPlanLines(adherence.lineItems, 5);
  const dynamicInsights = buildDynamicInsights({
    categoryBreakdown: stats.categoryBreakdown ?? [],
    topPayees: stats.topPayees ?? [],
    totalExpenses: stats.currentMonthStats.expenses,
    monthIncome: stats.currentMonthStats.income,
    monthExpenses: stats.currentMonthStats.expenses,
    monthNet: stats.currentMonthStats.netFlow,
  });

  const monthlyTrends = (stats.monthlyTrends ?? []).slice(-6);
  return {
    segmentSplit,
    spendingContext,
    topCategories,
    overBudgetBuckets,
    unstartedLines,
    dynamicInsights,
    monthlyTrends,
    disciplineSummary,
    adherence: {
      plannedTotal: adherence.plannedTotal,
      actualTotal: adherence.actualTotal,
      overallScore: adherence.overallScore,
      monthLabel: adherence.monthLabel,
    },
  };
}
