import { prisma } from '@/lib/db';
import type { BreakdownCategory } from '@/features/money-plan/data/money-plan';
import { transactionMatchesLineItem } from '@/features/dashboard/config/breakdown-line-map';
import { mapCategoryToBucket } from '@/features/dashboard/config/category-bucket-map';
import {
  ensureDefaultIncomeBudgetPlan,
  rollupActualToUserBuckets,
  scaleIncomeBudgetBuckets,
} from '@/lib/income-budget-service';
import { isNonPlanExpenseCategory } from '@/features/dashboard/config/plan-expense-categories';
import {
  getEffectiveExpenseAmounts,
  loadSettlementLookup,
} from '@/lib/transaction-settlement-service';
import {
  type PlanIncomeSource,
  type ResolvedPlanIncome,
  resolvePlanBaseIncome,
} from '@/lib/plan-income';

export type BucketStatus = 'on_track' | 'warning' | 'over';
export type GoalStatus = 'on_track' | 'behind' | 'completed';

export interface BucketAdherence {
  key: string;
  label: string;
  variant?: BreakdownCategory;
  percentage?: number;
  planned: number;
  actual: number;
  remaining: number;
  percentUsed: number;
  status: BucketStatus;
  score: number;
}

export interface LineItemAdherence {
  label: string;
  cat: BreakdownCategory;
  planned: number;
  actual: number;
  remaining: number;
  percentUsed: number;
  status: BucketStatus;
  isBuffer: boolean;
}

export interface GoalAdherence {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPercent: number;
  expectedProgressPercent: number | null;
  targetDate: string | null;
  status: GoalStatus;
}

export interface PlanAdherenceResult {
  buckets: BucketAdherence[];
  lineItems: LineItemAdherence[];
  plannedTotal: number;
  actualTotal: number;
  overallScore: number;
  goals: GoalAdherence[];
  goalsOnTrack: number;
  activeGoals: number;
  monthLabel: string;
  planBaseIncome: number;
  planIncomeSource: PlanIncomeSource;
  budgetPlanName?: string;
  budgetTemplateId?: string;
}

export interface LineItemTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  grossAmount: number;
  categoryName: string | null;
  store: string | null;
  personName: string | null;
  settlementId?: string | null;
  settlementLabel?: string | null;
  settlementType?: string | null;
  settlementNetExpense?: number | null;
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end, now };
}

function getBucketStatus(percentUsed: number): BucketStatus {
  if (percentUsed > 100) return 'over';
  if (percentUsed > 85) return 'warning';
  return 'on_track';
}

function getBucketScore(planned: number, actual: number): number {
  if (planned <= 0) return actual <= 0 ? 100 : 0;
  if (actual <= planned) return 100;
  const overRatio = (actual - planned) / planned;
  return Math.max(0, 100 - overRatio * 100);
}

function getGoalStatus(
  progressPercent: number,
  expectedProgressPercent: number | null,
  isComplete: boolean,
): GoalStatus {
  if (isComplete || progressPercent >= 100) return 'completed';
  if (expectedProgressPercent === null) {
    return progressPercent >= 50 ? 'on_track' : 'behind';
  }
  return progressPercent >= expectedProgressPercent * 0.9 ? 'on_track' : 'behind';
}

export async function getPlanAdherence(
  userId: string,
  planIncome?: ResolvedPlanIncome,
): Promise<PlanAdherenceResult> {
  const { start, end, now } = getCurrentMonthRange();
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const resolvedPlanIncome = planIncome ?? resolvePlanBaseIncome({});
  const userBudgetPlan = await ensureDefaultIncomeBudgetPlan(userId);
  const scaledUserBuckets = scaleIncomeBudgetBuckets(userBudgetPlan, resolvedPlanIncome.baseIncome);

  const [expenseTransactions, goals, settlementLookup] = await Promise.all([
    prisma.transaction
      .findMany({
        where: {
          userId,
          isDeleted: false,
          financialCategory: 'EXPENSE',
          debitAmount: { gt: 0 },
          transactionDate: { gte: start, lte: end },
        },
        select: {
          id: true,
          transactionDate: true,
          description: true,
          debitAmount: true,
          store: true,
          personName: true,
          category: { select: { name: true } },
        },
        orderBy: { transactionDate: 'desc' },
      })
      .catch(() => []),
    (prisma as any).goal
      .findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          title: true,
          targetAmount: true,
          currentAmount: true,
          targetDate: true,
          createdAt: true,
        },
        orderBy: [{ priority: 'desc' }, { targetDate: 'asc' }],
        take: 10,
      })
      .catch(() => []),
    loadSettlementLookup(userId, start, end),
  ]);

  const effectiveAmounts = getEffectiveExpenseAmounts(
    expenseTransactions.map((tx) => ({
      id: tx.id,
      amount: Number(tx.debitAmount) || 0,
    })),
    settlementLookup,
  );

  const txInputs = expenseTransactions
    .map((tx) => ({
      id: tx.id,
      categoryName: tx.category?.name ?? 'Uncategorized',
      description: tx.description,
      store: tx.store,
      personName: tx.personName,
      amount: effectiveAmounts.get(tx.id) ?? (Number(tx.debitAmount) || 0),
    }))
    .filter((tx) => tx.amount > 0);

  const actualByBreakdown = new Map<BreakdownCategory, number>();
  const actualByCategory = new Map<string, { amount: number; cat: BreakdownCategory }>();

  for (const tx of txInputs) {
    if (isNonPlanExpenseCategory(tx.categoryName ?? '')) continue;

    const categoryName = tx.categoryName ?? 'Uncategorized';
    const breakdownCat = mapCategoryToBucket(categoryName);

    actualByBreakdown.set(
      breakdownCat,
      (actualByBreakdown.get(breakdownCat) || 0) + tx.amount,
    );

    const existing = actualByCategory.get(categoryName);
    if (existing) {
      existing.amount += tx.amount;
    } else {
      actualByCategory.set(categoryName, { amount: tx.amount, cat: breakdownCat });
    }
  }

  const actualByUserBucket = rollupActualToUserBuckets(actualByBreakdown, userBudgetPlan.buckets);

  const buckets: BucketAdherence[] = scaledUserBuckets.map((bucket) => {
    const planned = bucket.planned;
    const actual = actualByUserBucket.get(bucket.key) || 0;
    const remaining = Math.max(0, planned - actual);
    const percentUsed = planned > 0 ? (actual / planned) * 100 : actual > 0 ? 100 : 0;

    return {
      key: bucket.key,
      label: bucket.label,
      variant: bucket.variant,
      percentage: bucket.percentage,
      planned,
      actual,
      remaining,
      percentUsed,
      status: getBucketStatus(percentUsed),
      score: getBucketScore(planned, actual),
    };
  });

  const overallScore = buckets.length
    ? Math.round(buckets.reduce((sum, bucket) => sum + bucket.score, 0) / buckets.length)
    : 100;

  const lineItems: LineItemAdherence[] = [...actualByCategory.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([label, { amount, cat }]) => ({
      label,
      cat,
      planned: 0,
      actual: Math.round(amount),
      remaining: 0,
      percentUsed: amount > 0 ? 100 : 0,
      status: 'on_track' as BucketStatus,
      isBuffer: false,
    }));

  const plannedTotal = scaledUserBuckets.reduce((sum, bucket) => sum + bucket.planned, 0);
  const actualTotal = buckets.reduce((sum, bucket) => sum + bucket.actual, 0);

  const goalAdherence: GoalAdherence[] = (goals as any[]).map((goal) => {
    const targetAmount = Number(goal.targetAmount) || 0;
    const currentAmount = Number(goal.currentAmount) || 0;
    const progressPercent = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;

    let expectedProgressPercent: number | null = null;
    if (goal.targetDate) {
      const targetDate = new Date(goal.targetDate);
      const createdAt = new Date(goal.createdAt);
      const totalMs = targetDate.getTime() - createdAt.getTime();
      const elapsedMs = now.getTime() - createdAt.getTime();
      if (totalMs > 0) {
        expectedProgressPercent = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
      }
    }

    const status = getGoalStatus(progressPercent, expectedProgressPercent, currentAmount >= targetAmount && targetAmount > 0);

    return {
      id: goal.id,
      name: goal.title,
      targetAmount,
      currentAmount,
      progressPercent,
      expectedProgressPercent,
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : null,
      status,
    };
  });

  const activeGoals = goalAdherence.filter((goal) => goal.status !== 'completed').length;
  const goalsOnTrack = goalAdherence.filter((goal) => goal.status === 'on_track' || goal.status === 'completed').length;

  return {
    buckets,
    lineItems,
    plannedTotal,
    actualTotal,
    overallScore,
    goals: goalAdherence,
    goalsOnTrack,
    activeGoals: goalAdherence.length,
    monthLabel,
    planBaseIncome: resolvedPlanIncome.baseIncome,
    planIncomeSource: resolvedPlanIncome.source,
    budgetPlanName: userBudgetPlan.name,
    budgetTemplateId: userBudgetPlan.templateId,
  };
}

export async function getLineItemTransactions(
  userId: string,
  lineItemLabel: string,
): Promise<LineItemTransaction[]> {
  const { start, end } = getCurrentMonthRange();

  const [transactions, settlementLookup] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        isDeleted: false,
        financialCategory: 'EXPENSE',
        debitAmount: { gt: 0 },
        transactionDate: { gte: start, lte: end },
      },
      select: {
        id: true,
        transactionDate: true,
        description: true,
        debitAmount: true,
        store: true,
        personName: true,
        category: { select: { name: true } },
      },
      orderBy: { transactionDate: 'desc' },
    }),
    loadSettlementLookup(userId, start, end),
  ]);

  const effectiveAmounts = getEffectiveExpenseAmounts(
    transactions.map((tx) => ({
      id: tx.id,
      amount: Number(tx.debitAmount) || 0,
    })),
    settlementLookup,
  );

  return transactions
    .filter((tx) => {
      const categoryName = tx.category?.name ?? 'Uncategorized';
      if (categoryName === lineItemLabel) return true;
      return transactionMatchesLineItem(
        {
          categoryName,
          description: tx.description,
          store: tx.store,
          personName: tx.personName,
          amount: Number(tx.debitAmount) || 0,
        },
        lineItemLabel,
      );
    })
    .map((tx) => {
      const grossAmount = Number(tx.debitAmount) || 0;
      const settlement = settlementLookup.byTransactionId.get(tx.id);
      const amount = effectiveAmounts.get(tx.id) ?? grossAmount;

      return {
        id: tx.id,
        date: tx.transactionDate.toISOString(),
        description: tx.description ?? '',
        amount,
        grossAmount,
        categoryName: tx.category?.name ?? null,
        store: tx.store,
        personName: tx.personName,
        settlementId: settlement?.settlementId ?? null,
        settlementLabel: settlement?.label ?? null,
        settlementType: settlement?.type ?? null,
        settlementNetExpense: settlement?.netExpense ?? null,
      };
    });
}
