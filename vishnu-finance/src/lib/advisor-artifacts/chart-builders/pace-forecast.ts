/**
 * Compatibility shim — forecast logic lives in advisor-artifacts/forecast.
 */
export type {
  PaceTarget,
  ForecastTimelineMilestone,
  ForecastTimelinePayload,
  ForecastWindow,
  PaceBreakdown,
  ForecastComputeResult as PaceForecastBuildResult,
} from '@/lib/advisor-artifacts/forecast';

export {
  isPaceForecastQuery,
  parsePaydayFromQuery,
  parsePaceLookbackMonths,
  lastNMonthsDateRange,
  resolveForecastWindow,
  buildPayCycleRanges,
  computePaceBreakdown,
  computeSuggestedPace,
  targetsFromDiscipline,
  computeForecastResult,
  runForecast,
} from '@/lib/advisor-artifacts/forecast';

import type { TransactionDetail } from '@/lib/financial-analysis';
import type { BucketAdherence } from '@/lib/plan-adherence-service';
import {
  computeForecastResult,
  computeWindowBucketAdherence,
  lastNMonthsDateRange,
  resolveForecastWindow,
  type ForecastWindow,
  type PaceTarget,
  type WindowBucketRow,
} from '@/lib/advisor-artifacts/forecast';
import type { ScaledIncomeBudgetBucket } from '@/lib/income-budget-service';

/**
 * @deprecated Prefer runForecast / computeForecastResult.
 * Kept for chart-plugin sync path when engine result is not precomputed.
 */
export function buildPaceForecastChart(args: {
  transactions: TransactionDetail[];
  targets: PaceTarget[];
  fallbackMonthlyPace?: number;
  lookbackMonths?: number;
  adherenceBuckets?: BucketAdherence[] | null;
  window?: ForecastWindow;
  windowBuckets?: WindowBucketRow[];
  scaledBuckets?: ScaledIncomeBudgetBucket[];
  goalsFundingNeedMonthly?: number | null;
  query?: string;
}): ReturnType<typeof computeForecastResult> | null {
  const window =
    args.window ||
    (args.query
      ? resolveForecastWindow(args.query)
      : ({
          ...lastNMonthsDateRange(args.lookbackMonths || 3),
          mode: 'calendar_months' as const,
          label: `last ${args.lookbackMonths || 3} calendar month(s)`,
          periods: [],
        } satisfies ForecastWindow));

  // Ensure periods exist for calendar fallback
  let resolved = window;
  if (!resolved.periods?.length && args.query) {
    resolved = resolveForecastWindow(args.query);
  } else if (!resolved.periods?.length) {
    resolved = resolveForecastWindow(
      `last ${args.lookbackMonths || 3} months predict goals`,
    );
  }

  let windowBuckets = args.windowBuckets;
  if (!windowBuckets && args.scaledBuckets) {
    windowBuckets = computeWindowBucketAdherence({
      transactions: args.transactions,
      scaledBuckets: args.scaledBuckets,
      window: resolved,
    });
  }
  if (!windowBuckets && args.adherenceBuckets) {
    // Legacy: map current-month adherence into WindowBucketRow shape (should not be used by runForecast)
    windowBuckets = args.adherenceBuckets.map((b) => ({
      key: b.key,
      label: b.label,
      plannedMonthly: b.planned,
      actualMonthly: b.actual,
      mapFrom: [],
      isSavingsLike: /\b(sav|invest)/i.test(`${b.key} ${b.label}`),
    }));
  }

  const result = computeForecastResult({
    transactions: args.transactions,
    targets: args.targets,
    window: resolved,
    windowBuckets: windowBuckets || [],
    goalsFundingNeedMonthly: args.goalsFundingNeedMonthly ?? null,
  });

  if (
    args.targets.length === 0 &&
    result.timeline.history.length === 0 &&
    result.timeline.currentPaceMonthly === 0
  ) {
    return null;
  }

  return result;
}
