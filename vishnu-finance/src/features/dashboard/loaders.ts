import { dashboardService } from '@/lib/dashboard-service';
import { getPlanAdherence } from '@/lib/plan-adherence-service';
import type { DashboardBootstrap } from '@/features/dashboard/types';
import { getCurrentMonthRange, parseLocalDateEnd, parseLocalDateStart } from '@/lib/date-range';
import { loadGoals, loadDeadlines, loadWishlist } from '@/features/plans/loaders';
import { computeDisciplineSummary } from '@/lib/plans-discipline';
import { loadPlanIncomeContext } from '@/lib/plan-income';
import { getCurrentAccountBalance } from '@/lib/account-balance-service';

import type { Goal, DeadlinesResponse, WishlistResponse } from '@/features/plans/types';

export interface PreloadedPlanEntities {
  goals: Goal[];
  deadlines: DeadlinesResponse;
  wishlist: WishlistResponse;
}

const EMPTY_DEADLINES: DeadlinesResponse = {
  data: [],
  pagination: {
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const EMPTY_WISHLIST: WishlistResponse = {
  data: [],
  pagination: {
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

async function loadGoalsSafe(userId: string, preloaded?: Goal[]): Promise<Goal[]> {
  if (preloaded) return preloaded;
  try {
    return await loadGoals(userId);
  } catch (error) {
    console.error('[dashboard] goals load failed', { userId, error });
    return [];
  }
}

async function loadDeadlinesSafe(
  userId: string,
  preloaded?: DeadlinesResponse,
): Promise<DeadlinesResponse> {
  if (preloaded) return preloaded;
  try {
    return await loadDeadlines(userId);
  } catch (error) {
    console.error('[dashboard] deadlines load failed', { userId, error });
    return EMPTY_DEADLINES;
  }
}

async function loadWishlistSafe(
  userId: string,
  preloaded?: WishlistResponse,
): Promise<WishlistResponse> {
  if (preloaded) return preloaded;
  try {
    return await loadWishlist(userId);
  } catch (error) {
    console.error('[dashboard] wishlist load failed', { userId, error });
    return EMPTY_WISHLIST;
  }
}

export async function loadDashboard(
  userId: string,
  preloaded?: PreloadedPlanEntities,
): Promise<DashboardBootstrap> {
  const monthRange = getCurrentMonthRange();
  const startDate = parseLocalDateStart(monthRange.startDate);
  const endDate = parseLocalDateEnd(monthRange.endDate);

  const planIncomeContextPromise = loadPlanIncomeContext(userId);

  const goalsPromise = loadGoalsSafe(userId, preloaded?.goals);
  const deadlinesPromise = loadDeadlinesSafe(userId, preloaded?.deadlines);
  const wishlistPromise = loadWishlistSafe(userId, preloaded?.wishlist);

  const statsPromise = Promise.all([goalsPromise, deadlinesPromise, wishlistPromise]).then(
    ([goals, deadlines, wishlist]) =>
      dashboardService.getSimpleStats({
        userId,
        startDate,
        endDate,
        preloaded: {
          goals,
          deadlines: {
            count: deadlines.pagination?.total ?? deadlines.data.length,
            items: deadlines.data
              .filter((d) => !d.isCompleted)
              .map((d) => ({
                title: d.title,
                dueDate: d.dueDate,
                amount: Number(d.amount) || 0,
              })),
          },
          wishlist,
        },
      }),
  );

  const [stats, goals, deadlines, wishlist, planIncomeContext, accountBalance, adherence] = await Promise.all([
    statsPromise,
    goalsPromise,
    deadlinesPromise,
    wishlistPromise,
    planIncomeContextPromise,
    getCurrentAccountBalance(userId).catch((error) => {
      console.error('[dashboard] account balance load failed', { userId, error });
      return null;
    }),
    planIncomeContextPromise.then(async (ctx) => {
      try {
        return await getPlanAdherence(userId, ctx.planScale);
      } catch (error) {
        console.error('[dashboard] plan adherence load failed', { userId, error });
        return {
          buckets: [],
          lineItems: [],
          plannedTotal: 0,
          actualTotal: 0,
          overallScore: 0,
          goals: [],
          goalsOnTrack: 0,
          activeGoals: 0,
          monthLabel: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          planBaseIncome: ctx.planScale.baseIncome,
          planIncomeSource: ctx.planScale.source,
        };
      }
    }),
  ]);

  const planIncome = planIncomeContext.planScale;

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
