import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { loadDashboard } from '@/features/dashboard/loaders';
import { loadGoals, loadDeadlines, loadWishlist } from '@/features/plans/loaders';
import {
  buildDynamicInsights,
  computeNeedsWantsSavingsSplit,
  computeSpendingContext,
  getOverBudgetBuckets,
  getTopCategoriesWithPct,
  getUnstartedPlanLines,
} from '@/lib/dashboard-insights';

async function requireUser(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) return null;
  const user = await AuthService.getUserFromToken(token.value);
  if (!user || !user.isActive) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dashboard = await loadDashboard(user.id);
    const { stats, adherence, disciplineSummary } = dashboard;

    const [goals, deadlines, wishlist] = await Promise.all([
      loadGoals(user.id),
      loadDeadlines(user.id),
      loadWishlist(user.id),
    ]);

    const segmentSplit = computeNeedsWantsSavingsSplit(adherence.buckets);
    const spendingContext = computeSpendingContext(currentMonthStatsFrom(stats), adherence.plannedTotal);
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

    const monthlyTrends = (stats.monthlyTrends ?? []).slice(-6).map((t) => ({
      month: t.month,
      expenses: t.expenses,
      income: t.income,
    }));

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('[advisor/insights]', error);
    return NextResponse.json({ error: 'Failed to load insights' }, { status: 500 });
  }
}

function currentMonthStatsFrom(stats: Awaited<ReturnType<typeof loadDashboard>>['stats']) {
  return stats.currentMonthStats;
}
