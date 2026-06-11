import { prisma } from '@/lib/db';
import type { CategoryVariant } from '@/design/tokens';
import type { BreakdownCategory } from '@/features/money-plan/data/money-plan';
import {
  INCOME_BUDGET_TEMPLATES,
  parseMapFrom,
  serializeMapFrom,
  validateBucketPercentages,
  type IncomeBudgetTemplateId,
} from '@/lib/income-budget-templates';

export interface IncomeBudgetBucketDto {
  id?: string;
  key: string;
  label: string;
  percentage: number;
  variant: CategoryVariant;
  mapFrom: BreakdownCategory[];
  sortOrder: number;
}

export interface IncomeBudgetPlanDto {
  id: string;
  name: string;
  templateId: IncomeBudgetTemplateId;
  buckets: IncomeBudgetBucketDto[];
}

export interface ScaledIncomeBudgetBucket extends IncomeBudgetBucketDto {
  planned: number;
}

function slugifyKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'bucket';
}

function mapBucketRow(row: {
  id: string;
  key: string;
  label: string;
  percentage: number;
  variant: string;
  mapFrom: string;
  sortOrder: number;
}): IncomeBudgetBucketDto {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    percentage: row.percentage,
    variant: row.variant as CategoryVariant,
    mapFrom: parseMapFrom(row.mapFrom),
    sortOrder: row.sortOrder,
  };
}

export async function getActiveIncomeBudgetPlan(userId: string): Promise<IncomeBudgetPlanDto | null> {
  const plan = await prisma.incomeBudgetPlan.findFirst({
    where: { userId, isActive: true },
    include: { buckets: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!plan) return null;
  return {
    id: plan.id,
    name: plan.name,
    templateId: plan.templateId as IncomeBudgetTemplateId,
    buckets: plan.buckets.map(mapBucketRow),
  };
}

export async function ensureDefaultIncomeBudgetPlan(userId: string): Promise<IncomeBudgetPlanDto> {
  const existing = await getActiveIncomeBudgetPlan(userId);
  if (existing) return existing;
  return createIncomeBudgetFromTemplate(userId, '50-30-20');
}

export async function createIncomeBudgetFromTemplate(
  userId: string,
  templateId: IncomeBudgetTemplateId,
): Promise<IncomeBudgetPlanDto> {
  const template = INCOME_BUDGET_TEMPLATES[templateId] ?? INCOME_BUDGET_TEMPLATES['50-30-20'];

  await prisma.incomeBudgetPlan.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });

  const plan = await prisma.incomeBudgetPlan.create({
    data: {
      userId,
      name: template.name,
      templateId: template.id,
      isActive: true,
      buckets: {
        create: template.buckets.map((bucket, index) => ({
          key: bucket.key,
          label: bucket.label,
          percentage: bucket.percentage,
          variant: bucket.variant,
          mapFrom: serializeMapFrom(bucket.mapFrom),
          sortOrder: index,
        })),
      },
    },
    include: { buckets: { orderBy: { sortOrder: 'asc' } } },
  });

  return {
    id: plan.id,
    name: plan.name,
    templateId: plan.templateId as IncomeBudgetTemplateId,
    buckets: plan.buckets.map(mapBucketRow),
  };
}

export async function saveIncomeBudgetPlan(
  userId: string,
  input: {
    templateId?: IncomeBudgetTemplateId;
    name?: string;
    buckets: Omit<IncomeBudgetBucketDto, 'id'>[];
  },
): Promise<IncomeBudgetPlanDto> {
  const validationError = validateBucketPercentages(input.buckets);
  if (validationError) {
    throw new Error(validationError);
  }

  const usedKeys = new Set<string>();
  const normalizedBuckets = input.buckets.map((bucket, index) => {
    let key = bucket.key?.trim() || slugifyKey(bucket.label);
    if (usedKeys.has(key)) {
      key = `${key}-${index + 1}`;
    }
    usedKeys.add(key);
    return {
      key,
      label: bucket.label.trim(),
      percentage: bucket.percentage,
      variant: bucket.variant,
      mapFrom: serializeMapFrom(bucket.mapFrom),
      sortOrder: index,
    };
  });

  const existing = await getActiveIncomeBudgetPlan(userId);
  const templateId = input.templateId ?? existing?.templateId ?? 'custom';
  const name = input.name?.trim() || existing?.name || INCOME_BUDGET_TEMPLATES[templateId]?.name || 'My budget';

  if (existing) {
    await prisma.$transaction([
      prisma.incomeBudgetBucket.deleteMany({ where: { planId: existing.id } }),
      prisma.incomeBudgetPlan.update({
        where: { id: existing.id },
        data: {
          name,
          templateId,
          buckets: { create: normalizedBuckets },
        },
      }),
    ]);
    const updated = await getActiveIncomeBudgetPlan(userId);
    if (!updated) throw new Error('Failed to save budget plan');
    return updated;
  }

  await prisma.incomeBudgetPlan.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });

  const plan = await prisma.incomeBudgetPlan.create({
    data: {
      userId,
      name,
      templateId,
      isActive: true,
      buckets: { create: normalizedBuckets },
    },
    include: { buckets: { orderBy: { sortOrder: 'asc' } } },
  });

  return {
    id: plan.id,
    name: plan.name,
    templateId: plan.templateId as IncomeBudgetTemplateId,
    buckets: plan.buckets.map(mapBucketRow),
  };
}

export function scaleIncomeBudgetBuckets(
  plan: IncomeBudgetPlanDto,
  baseIncome: number,
): ScaledIncomeBudgetBucket[] {
  return plan.buckets.map((bucket) => ({
    ...bucket,
    planned: Math.round((bucket.percentage / 100) * baseIncome),
  }));
}

export function rollupActualToUserBuckets(
  actualByBreakdown: Map<BreakdownCategory, number>,
  buckets: IncomeBudgetBucketDto[],
): Map<string, number> {
  const result = new Map<string, number>();
  for (const bucket of buckets) {
    const actual = bucket.mapFrom.reduce(
      (sum, cat) => sum + (actualByBreakdown.get(cat) || 0),
      0,
    );
    result.set(bucket.key, actual);
  }
  return result;
}
