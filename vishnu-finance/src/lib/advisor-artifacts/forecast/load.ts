import { analyzeUserFinances, type TransactionDetail } from '@/lib/financial-analysis';
import {
  ensureDefaultIncomeBudgetPlan,
  scaleIncomeBudgetBuckets,
  type ScaledIncomeBudgetBucket,
} from '@/lib/income-budget-service';
import type { DisciplineSummary } from '@/lib/plans-discipline';
import type { ForecastRequest, PaceTarget, WindowBucketRow } from './types';
import { computeWindowBucketAdherence } from './window-adherence';
import { targetsFromDiscipline } from './targets';

export interface ForecastInputs {
  transactions: TransactionDetail[];
  targets: PaceTarget[];
  windowBuckets: WindowBucketRow[];
  scaledBuckets: ScaledIncomeBudgetBucket[];
  goalsFundingNeedMonthly: number | null;
  disciplineSummary: DisciplineSummary | null;
  request: ForecastRequest;
}

/**
 * Load txns for the resolved window only — no chat amount/type filters.
 */
export async function loadForecastInputs(
  userId: string,
  request: ForecastRequest,
): Promise<ForecastInputs> {
  const [{ loadDashboard }, financialSummary, budgetPlan] = await Promise.all([
    import('@/features/dashboard/loaders'),
    analyzeUserFinances(
      userId,
      {
        startDate: request.window.startDate,
        endDate: request.window.endDate,
      },
      undefined,
      5000,
    ),
    ensureDefaultIncomeBudgetPlan(userId),
  ]);

  const dashboard = await loadDashboard(userId);
  const planBaseIncome =
    dashboard.adherence?.planBaseIncome ||
    dashboard.disciplineSummary?.capacity?.monthlyIncome ||
    0;
  const scaledBuckets = scaleIncomeBudgetBuckets(budgetPlan, planBaseIncome);
  const windowBuckets = computeWindowBucketAdherence({
    transactions: financialSummary.transactions,
    scaledBuckets,
    window: request.window,
  });

  const disciplineSummary = dashboard.disciplineSummary ?? null;
  const goalsFundingNeedMonthly =
    disciplineSummary?.totalRequiredPerMonth != null
      ? Math.round(disciplineSummary.totalRequiredPerMonth * 100) / 100
      : null;

  return {
    transactions: financialSummary.transactions,
    targets: targetsFromDiscipline(disciplineSummary),
    windowBuckets,
    scaledBuckets,
    goalsFundingNeedMonthly,
    disciplineSummary,
    request,
  };
}
