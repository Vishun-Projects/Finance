import type { Goal, Deadline, WishlistItem } from '@/features/plans/types';
import type { PlanIncomeSource } from '@/lib/plan-income';
import {
  isDeadlineOverdue,
  isDueInCurrentMonth,
  startOfDay,
  startOfToday,
} from '@/lib/utils/deadline-utils';

export type DisciplineStatus = 'ok' | 'tight' | 'overcommitted';
export type GoalPaceStatus = 'on_track' | 'behind' | 'no_date' | 'completed';

export interface PlanCapacity {
  monthlyIncome: number;
  plannedTotal: number;
  actualTotal: number;
  planBaseIncome: number;
  planIncomeSource?: PlanIncomeSource;
  /** Income above the planned total (only when credited income exceeds plan). */
  headroom: number;
  /** Plan budget not yet spent (planned − plan-tracked spend). Not the same as cash in bank. */
  underspend: number;
  /** Min(plan slack, income − spend): fundable from this month's credited income. */
  available: number;
  /** Unspent plan budget before cash cap (can exceed what you've actually received). */
  planSlack: number;
  /** Credited income this month minus plan-tracked spend. */
  cashAfterPlanSpend: number;
}

export interface GoalDiscipline {
  goalId: string;
  title: string;
  remaining: number;
  monthsUntil: number | null;
  monthlyRequired: number | null;
  paceStatus: GoalPaceStatus;
}

export interface DeadlineDiscipline {
  deadlineId: string;
  title: string;
  amount: number;
  dueDate: string;
  isOverdue: boolean;
  isDueThisMonth: boolean;
  monthlySetAside: number | null;
  requiredThisMonth: number;
  label: string;
}

export interface WishlistDiscipline {
  itemId: string;
  title: string;
  estimatedCost: number;
  monthsUntil: number | null;
  monthlyRequired: number | null;
}

export interface DisciplineSummary {
  capacity: PlanCapacity;
  goals: GoalDiscipline[];
  deadlines: DeadlineDiscipline[];
  wishlist: WishlistDiscipline[];
  totalRequiredPerMonth: number;
  gap: number;
  status: DisciplineStatus;
}

export function monthsUntil(targetDate: string | Date, ref = new Date()): number {
  const target = startOfDay(new Date(targetDate));
  const today = startOfToday(ref);

  if (target.getTime() <= today.getTime()) {
    return 1;
  }

  let months =
    (target.getFullYear() - today.getFullYear()) * 12 +
    (target.getMonth() - today.getMonth());

  if (target.getDate() < today.getDate()) {
    months -= 1;
  }

  return Math.max(1, months);
}

export function computeGoalPaceStatus(goal: Goal): GoalPaceStatus {
  if (goal.status === 'COMPLETED' || goal.currentAmount >= goal.targetAmount) {
    return 'completed';
  }

  if (!goal.targetDate) {
    return 'no_date';
  }

  const created = startOfDay(new Date(goal.createdAt));
  const target = startOfDay(new Date(goal.targetDate));
  const today = startOfToday();

  if (target.getTime() <= today.getTime()) {
    return goal.currentAmount >= goal.targetAmount ? 'completed' : 'behind';
  }

  const totalMs = target.getTime() - created.getTime();
  const elapsedMs = today.getTime() - created.getTime();

  if (totalMs <= 0) {
    return 'behind';
  }

  const expectedProgress = Math.min(1, Math.max(0, elapsedMs / totalMs));
  const actualProgress =
    goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;

  return actualProgress >= expectedProgress * 0.92 ? 'on_track' : 'behind';
}

export function computeGoalMonthlyRequired(goal: Goal): GoalDiscipline {
  const remaining = Math.max(0, (goal.targetAmount ?? 0) - (goal.currentAmount ?? 0));
  const paceStatus = computeGoalPaceStatus(goal);

  if (paceStatus === 'completed') {
    return {
      goalId: goal.id,
      title: goal.title,
      remaining: 0,
      monthsUntil: null,
      monthlyRequired: 0,
      paceStatus,
    };
  }

  if (!goal.targetDate) {
    return {
      goalId: goal.id,
      title: goal.title,
      remaining,
      monthsUntil: null,
      monthlyRequired: null,
      paceStatus: 'no_date',
    };
  }

  const monthCount = monthsUntil(goal.targetDate);
  const monthlyRequired = remaining / monthCount;

  return {
    goalId: goal.id,
    title: goal.title,
    remaining,
    monthsUntil: monthCount,
    monthlyRequired,
    paceStatus,
  };
}

export function computeDeadlineDiscipline(deadline: Deadline): DeadlineDiscipline | null {
  if (deadline.isCompleted) {
    return null;
  }

  const amount = Number(deadline.amount) || 0;
  const overdue = isDeadlineOverdue(deadline);
  const dueThisMonth = isDueInCurrentMonth(deadline.dueDate);

  if (overdue) {
    return {
      deadlineId: deadline.id,
      title: deadline.title,
      amount,
      dueDate: deadline.dueDate,
      isOverdue: true,
      isDueThisMonth: dueThisMonth,
      monthlySetAside: null,
      requiredThisMonth: amount,
      label: amount > 0 ? `₹${Math.round(amount).toLocaleString('en-IN')} due now (overdue)` : 'Overdue',
    };
  }

  if (dueThisMonth) {
    return {
      deadlineId: deadline.id,
      title: deadline.title,
      amount,
      dueDate: deadline.dueDate,
      isOverdue: false,
      isDueThisMonth: true,
      monthlySetAside: null,
      requiredThisMonth: amount,
      label: amount > 0 ? `₹${Math.round(amount).toLocaleString('en-IN')} due this month` : 'Due this month',
    };
  }

  const monthCount = monthsUntil(deadline.dueDate);
  const monthlySetAside = amount > 0 ? amount / monthCount : 0;
  const dueLabel = new Date(deadline.dueDate).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });

  return {
    deadlineId: deadline.id,
    title: deadline.title,
    amount,
    dueDate: deadline.dueDate,
    isOverdue: false,
    isDueThisMonth: false,
    monthlySetAside,
    requiredThisMonth: monthlySetAside,
    label:
      amount > 0
        ? `Save ₹${Math.round(monthlySetAside).toLocaleString('en-IN')}/mo · due ${dueLabel}`
        : `Due ${dueLabel}`,
  };
}

export function computeWishlistMonthlyRequired(item: WishlistItem): WishlistDiscipline | null {
  if (item.isCompleted) {
    return null;
  }

  const estimatedCost = Number(item.estimatedCost) || 0;

  if (!item.targetDate) {
    return {
      itemId: item.id,
      title: item.title,
      estimatedCost,
      monthsUntil: null,
      monthlyRequired: null,
    };
  }

  const monthCount = monthsUntil(item.targetDate);

  return {
    itemId: item.id,
    title: item.title,
    estimatedCost,
    monthsUntil: monthCount,
    monthlyRequired: estimatedCost / monthCount,
  };
}

export function computePlanCapacity(input: {
  monthlyIncome: number;
  plannedTotal: number;
  actualTotal: number;
  planBaseIncome?: number;
  planIncomeSource?: PlanIncomeSource;
}): PlanCapacity {
  const monthlyIncome = Math.max(0, input.monthlyIncome);
  const plannedTotal = Math.max(0, input.plannedTotal);
  const actualTotal = Math.max(0, input.actualTotal);
  const headroom = Math.max(0, monthlyIncome - plannedTotal);
  const underspend = Math.max(0, plannedTotal - actualTotal);
  const planSlack = headroom + underspend;
  const cashAfterPlanSpend = Math.max(0, monthlyIncome - actualTotal);
  // When salary credited < plan take-home, raw underspend can look like extra cash (e.g. ₹33k
  // "remaining" on a ₹46k plan after ₹13k spend). Cap by what income actually supports.
  const available = Math.min(planSlack, cashAfterPlanSpend);

  return {
    monthlyIncome,
    plannedTotal,
    actualTotal,
    planBaseIncome: input.planBaseIncome ?? plannedTotal,
    planIncomeSource: input.planIncomeSource,
    headroom,
    underspend,
    available,
    planSlack,
    cashAfterPlanSpend,
  };
}

function resolveDisciplineStatus(gap: number, available: number): DisciplineStatus {
  if (available <= 0) {
    return 'overcommitted';
  }

  const ratio = gap / available;

  if (ratio < 0) {
    return 'overcommitted';
  }

  if (ratio <= 0.15) {
    return 'tight';
  }

  return 'ok';
}

export function computeDisciplineSummary(
  goals: Goal[],
  deadlines: Deadline[],
  wishlist: WishlistItem[],
  capacityInput: {
    monthlyIncome: number;
    plannedTotal: number;
    actualTotal: number;
    planBaseIncome?: number;
    planIncomeSource?: PlanIncomeSource;
  },
): DisciplineSummary {
  const capacity = computePlanCapacity(capacityInput);

  const activeGoals = goals.filter(
    (g) => g.status !== 'COMPLETED' && (g.currentAmount ?? 0) < (g.targetAmount ?? 0),
  );
  const goalDisciplines = activeGoals.map(computeGoalMonthlyRequired);

  const deadlineDisciplines = deadlines
    .map(computeDeadlineDiscipline)
    .filter((d): d is DeadlineDiscipline => d !== null);

  const wishlistDisciplines = wishlist
    .map(computeWishlistMonthlyRequired)
    .filter((w): w is WishlistDiscipline => w !== null);

  const goalsRequired = goalDisciplines.reduce(
    (sum, g) => sum + (g.monthlyRequired ?? 0),
    0,
  );
  const deadlinesRequired = deadlineDisciplines.reduce(
    (sum, d) => sum + d.requiredThisMonth,
    0,
  );
  const wishlistRequired = wishlistDisciplines.reduce(
    (sum, w) => sum + (w.monthlyRequired ?? 0),
    0,
  );

  const totalRequiredPerMonth = goalsRequired + deadlinesRequired + wishlistRequired;
  const gap = capacity.available - totalRequiredPerMonth;
  const status = resolveDisciplineStatus(gap, capacity.available);

  return {
    capacity,
    goals: goalDisciplines,
    deadlines: deadlineDisciplines,
    wishlist: wishlistDisciplines,
    totalRequiredPerMonth,
    gap,
    status,
  };
}

export function formatDisciplineCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function goalPaceLabel(status: GoalPaceStatus): string {
  switch (status) {
    case 'on_track':
      return 'On track';
    case 'behind':
      return 'Behind';
    case 'completed':
      return 'Completed';
    case 'no_date':
    default:
      return 'No date';
  }
}

export interface SafeToSpendSummary {
  available: number;
  upcomingDuesThisMonth: number;
  safeToSpend: number;
}

export function sumUpcomingDuesThisMonth(deadlines: Deadline[]): number {
  return deadlines
    .filter((d) => !d.isCompleted && isDueInCurrentMonth(d.dueDate))
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
}

export function computeSafeToSpend(
  discipline: DisciplineSummary,
  upcomingDuesThisMonth: number,
): SafeToSpendSummary {
  const available = discipline.capacity.available;
  return {
    available,
    upcomingDuesThisMonth,
    safeToSpend: Math.max(0, available - upcomingDuesThisMonth),
  };
}
