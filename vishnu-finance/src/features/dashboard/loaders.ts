import { dashboardService } from '@/lib/dashboard-service';
import { getPlanAdherence } from '@/lib/plan-adherence-service';
import type { DashboardBootstrap } from '@/features/dashboard/types';
import { getCurrentMonthRange, parseLocalDateEnd, parseLocalDateStart } from '@/lib/date-range';
import { loadGoals, loadDeadlines, loadWishlist } from '@/features/plans/loaders';
import { computeDisciplineSummary } from '@/lib/plans-discipline';
import { loadPlanIncomeContext } from '@/lib/plan-income';
import { getCurrentAccountBalance } from '@/lib/account-balance-service';

export async function loadDashboard(userId: string): Promise<DashboardBootstrap> {
  const monthRange = getCurrentMonthRange();
  const startDate = parseLocalDateStart(monthRange.startDate);
  const endDate = parseLocalDateEnd(monthRange.endDate);

  const [stats, goals, deadlines, wishlist, planIncomeContext, accountBalance] = await Promise.all([
    dashboardService.getSimpleStats({ userId, startDate, endDate }),
    loadGoals(userId),
    loadDeadlines(userId),
    loadWishlist(userId),
    loadPlanIncomeContext(userId),
    getCurrentAccountBalance(userId),
  ]);

  const planIncome = planIncomeContext.planScale;
  const adherence = await getPlanAdherence(userId, planIncome);

  const disciplineSummary = computeDisciplineSummary(
    goals,
    deadlines.data ?? [],
    wishlist.data ?? [],
    {
      monthlyIncome: planIncomeContext.receivedSalaryAnchor,
      plannedTotal: adherence.plannedTotal,
      actualTotal: adherence.actualTotal,
      planBaseIncome: adherence.planBaseIncome,
      planIncomeSource: adherence.planIncomeSource,
    },
  );

  return {
    stats,
    adherence,
    disciplineSummary,
    planIncomeContext,
    accountBalance,
    monthContext: {
      monthLabel: adherence.monthLabel,
      income: stats.currentMonthStats.income,
      expenses: stats.currentMonthStats.expenses,
      netFlow: stats.currentMonthStats.netFlow,
      adjustedNetFlow: stats.currentMonthStats.adjustedNetFlow,
      disciplineSummary,
      planIncomeContext,
      accountBalance,
      adherence,
    },
  };
}
