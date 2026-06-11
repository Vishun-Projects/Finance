import type { CategoryVariant } from '@/design/tokens';
import type { BreakdownCategory } from '@/features/money-plan/data/money-plan';

export type IncomeBudgetTemplateId = '50-30-20' | 'custom';

export interface IncomeBudgetTemplateBucket {
  key: string;
  label: string;
  percentage: number;
  variant: CategoryVariant;
  mapFrom: BreakdownCategory[];
}

export interface IncomeBudgetTemplate {
  id: IncomeBudgetTemplateId;
  name: string;
  description: string;
  buckets: IncomeBudgetTemplateBucket[];
}

export const INCOME_BUDGET_TEMPLATES: Record<IncomeBudgetTemplateId, IncomeBudgetTemplate> = {
  '50-30-20': {
    id: '50-30-20',
    name: '50 · 30 · 20 rule',
    description: '50% needs, 30% wants, 20% savings & investments',
    buckets: [
      {
        key: 'needs',
        label: 'Needs',
        percentage: 50,
        variant: 'needs',
        mapFrom: ['needs', 'emi'],
      },
      {
        key: 'wants',
        label: 'Wants',
        percentage: 30,
        variant: 'wants',
        mapFrom: ['wants'],
      },
      {
        key: 'savings',
        label: 'Savings',
        percentage: 20,
        variant: 'invest',
        mapFrom: ['invest', 'insurance'],
      },
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom budget',
    description: 'Define your own categories and percentages',
    buckets: [
      {
        key: 'needs',
        label: 'Needs',
        percentage: 50,
        variant: 'needs',
        mapFrom: ['needs', 'emi'],
      },
      {
        key: 'wants',
        label: 'Wants',
        percentage: 30,
        variant: 'wants',
        mapFrom: ['wants'],
      },
      {
        key: 'savings',
        label: 'Savings',
        percentage: 20,
        variant: 'invest',
        mapFrom: ['invest', 'insurance'],
      },
    ],
  },
};

export function parseMapFrom(raw: string): BreakdownCategory[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is BreakdownCategory =>
      typeof v === 'string' &&
      ['needs', 'wants', 'emi', 'invest', 'insurance'].includes(v),
    );
  } catch {
    return [];
  }
}

export function serializeMapFrom(categories: BreakdownCategory[]): string {
  return JSON.stringify(categories);
}

export function validateBucketPercentages(buckets: { percentage: number }[]): string | null {
  if (buckets.length === 0) return 'Add at least one budget category';
  const total = buckets.reduce((sum, b) => sum + b.percentage, 0);
  if (Math.abs(total - 100) > 0.01) {
    return `Percentages must add up to 100% (currently ${Math.round(total)}%)`;
  }
  for (const bucket of buckets) {
    if (bucket.percentage <= 0) return 'Each category needs a percentage greater than 0';
  }
  return null;
}
