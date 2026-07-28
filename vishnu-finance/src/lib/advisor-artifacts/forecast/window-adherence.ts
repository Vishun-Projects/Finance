import type { BreakdownCategory } from '@/features/money-plan/data/money-plan';
import { mapCategoryToBucket } from '@/features/dashboard/config/category-bucket-map';
import { isNonPlanExpenseCategory } from '@/features/dashboard/config/plan-expense-categories';
import type { ScaledIncomeBudgetBucket } from '@/lib/income-budget-service';
import { rollupActualToUserBuckets } from '@/lib/income-budget-service';
import type { TransactionDetail } from '@/lib/financial-analysis';
import type { ForecastWindow, WindowBucketRow } from './types';

const SAVINGS_BREAKDOWN: ReadonlySet<BreakdownCategory> = new Set(['invest', 'insurance']);

export function isSavingsLikeBucket(bucket: {
  key: string;
  label: string;
  mapFrom: BreakdownCategory[];
}): boolean {
  if (bucket.mapFrom.some((c) => SAVINGS_BREAKDOWN.has(c))) return true;
  const blob = `${bucket.key} ${bucket.label}`.toLowerCase();
  return /\b(sav|invest|sip|insurance)\b/.test(blob);
}

/**
 * Plan bucket actuals over the same forecast window as pace (monthly-normalized).
 * Planned amounts are monthly plan scale; actuals are window totals / period count
 * (or day-normalized for explicit windows).
 */
export function computeWindowBucketAdherence(args: {
  transactions: TransactionDetail[];
  scaledBuckets: ScaledIncomeBudgetBucket[];
  window: ForecastWindow;
}): WindowBucketRow[] {
  const t0 = args.window.startDate.getTime();
  const t1 = args.window.endDate.getTime();
  const actualByBreakdown = new Map<BreakdownCategory, number>();

  for (const tx of args.transactions) {
    if (tx.type !== 'EXPENSE') continue;
    const d = tx.date instanceof Date ? tx.date : new Date(tx.date);
    const t = d.getTime();
    if (Number.isNaN(t) || t < t0 || t > t1) continue;
    const categoryName = tx.category?.name ?? 'Uncategorized';
    if (isNonPlanExpenseCategory(categoryName)) continue;
    const breakdownCat = mapCategoryToBucket(categoryName);
    actualByBreakdown.set(
      breakdownCat,
      (actualByBreakdown.get(breakdownCat) || 0) + tx.amount,
    );
  }

  const actualByUserBucket = rollupActualToUserBuckets(
    actualByBreakdown,
    args.scaledBuckets,
  );

  let divisor = Math.max(1, args.window.periods.length);
  if (args.window.mode === 'explicit') {
    const days = Math.max(
      1,
      Math.round((args.window.endDate.getTime() - args.window.startDate.getTime()) / 86400000) + 1,
    );
    divisor = days / 30.437;
  }

  return args.scaledBuckets.map((bucket) => {
    const totalActual = actualByUserBucket.get(bucket.key) || 0;
    const actualMonthly = Math.round((totalActual / divisor) * 100) / 100;
    return {
      key: bucket.key,
      label: bucket.label,
      plannedMonthly: bucket.planned,
      actualMonthly,
      mapFrom: [...bucket.mapFrom],
      isSavingsLike: isSavingsLikeBucket(bucket),
    };
  });
}
