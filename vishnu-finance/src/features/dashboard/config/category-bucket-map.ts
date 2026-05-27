import type { BreakdownCategory } from '@/features/money-plan/data/money-plan';
import {
  getPlanCategoryByName,
  mapCategoryNameToBucket as mapPlanCategoryToBucket,
} from '@/features/dashboard/config/plan-expense-categories';

/** @deprecated Prefer mapCategoryNameToBucket from plan-expense-categories. Kept for bucket rollup. */
const LEGACY_CATEGORY_TO_BUCKET: Record<string, BreakdownCategory> = {
  taxes: 'wants',
  'fees & charges': 'wants',
  'charity & donations': 'wants',
  education: 'needs',
  'other expenses': 'wants',
};

export function mapCategoryToBucket(categoryName: string): BreakdownCategory {
  const planBucket = mapPlanCategoryToBucket(categoryName);
  if (getPlanCategoryByName(categoryName)) {
    return planBucket;
  }

  const normalized = categoryName.trim().toLowerCase();
  if (LEGACY_CATEGORY_TO_BUCKET[normalized]) {
    return LEGACY_CATEGORY_TO_BUCKET[normalized];
  }

  return planBucket;
}

export const PLAN_BUCKET_KEYS = ['needs', 'wants', 'emi', 'investments', 'insurance'] as const;
export type PlanBucketKey = (typeof PLAN_BUCKET_KEYS)[number];

export const BUDGET_KEY_TO_BREAKDOWN: Record<PlanBucketKey, BreakdownCategory> = {
  needs: 'needs',
  wants: 'wants',
  emi: 'emi',
  investments: 'invest',
  insurance: 'insurance',
};
