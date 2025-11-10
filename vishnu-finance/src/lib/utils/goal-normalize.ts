import type { Goal } from '@/types/goals';

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizeGoal(goal: Goal): Goal {
  return {
    ...goal,
    targetAmount: toNumber(goal.targetAmount),
    currentAmount: toNumber(goal.currentAmount),
  };
}

export function normalizeGoals(goals: Goal[]): Goal[] {
  return goals.map(normalizeGoal);
}


