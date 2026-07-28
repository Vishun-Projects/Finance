import type { DisciplineSummary } from '@/lib/plans-discipline';
import type { PaceTarget } from './types';

/**
 * Order: active goals (by remaining), then dues, then wishlist. Cap 10.
 * Goals use remaining; wishlist/dues use full outstanding amounts from discipline.
 */
export function targetsFromDiscipline(summary?: DisciplineSummary | null): PaceTarget[] {
  if (!summary) return [];

  const goals: PaceTarget[] = [];
  for (const g of summary.goals) {
    if (g.paceStatus === 'completed' || g.remaining <= 0) continue;
    goals.push({
      id: `goal:${g.goalId}`,
      label: g.title,
      remaining: Math.round(g.remaining * 100) / 100,
      kind: 'goal',
    });
  }
  goals.sort((a, b) => a.remaining - b.remaining);

  const dues: PaceTarget[] = [];
  for (const d of summary.deadlines) {
    if (d.amount <= 0) continue;
    dues.push({
      id: `due:${d.deadlineId}`,
      label: d.title,
      remaining: Math.round(d.amount * 100) / 100,
      kind: 'due',
    });
  }
  dues.sort((a, b) => a.remaining - b.remaining);

  const wishes: PaceTarget[] = [];
  for (const w of summary.wishlist) {
    if (w.estimatedCost <= 0) continue;
    wishes.push({
      id: `wish:${w.itemId}`,
      label: w.title,
      remaining: Math.round(w.estimatedCost * 100) / 100,
      kind: 'wish',
    });
  }
  wishes.sort((a, b) => a.remaining - b.remaining);

  return [...goals, ...dues, ...wishes].slice(0, 10);
}
