import type { Deadline } from '@/features/plans/types';

export function startOfToday(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getCurrentMonthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getCurrentMonthLabel(date = new Date()): string {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function isDueInCurrentMonth(dueDate: string | Date, ref = new Date()): boolean {
  const due = new Date(dueDate);
  return due.getMonth() === ref.getMonth() && due.getFullYear() === ref.getFullYear();
}

export function isDeadlineOverdue(deadline: Pick<Deadline, 'dueDate' | 'isCompleted'>): boolean {
  if (deadline.isCompleted) return false;
  return startOfDay(new Date(deadline.dueDate)) < startOfToday();
}

export function isDeadlineUpcomingThisMonth(deadline: Pick<Deadline, 'dueDate' | 'isCompleted'>): boolean {
  if (deadline.isCompleted) return false;
  if (!isDueInCurrentMonth(deadline.dueDate)) return false;
  return startOfDay(new Date(deadline.dueDate)) >= startOfToday();
}

export interface DeadlineGroups {
  overdue: Deadline[];
  thisMonthUpcoming: Deadline[];
  thisMonthAll: Deadline[];
}

export function groupDeadlinesForCurrentMonth(deadlines: Deadline[]): DeadlineGroups {
  const active = deadlines.filter((d) => !d.isCompleted);
  const overdue = active
    .filter((d) => isDeadlineOverdue(d))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const thisMonthUpcoming = active
    .filter((d) => isDeadlineUpcomingThisMonth(d))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const thisMonthAll = active
    .filter((d) => isDueInCurrentMonth(d.dueDate))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return { overdue, thisMonthUpcoming, thisMonthAll };
}

export function filterDeadlinesForScope(
  deadlines: Deadline[],
  scope: 'this-month' | 'all',
): Deadline[] {
  if (scope === 'all') return deadlines;

  const active = deadlines.filter((d) => !d.isCompleted);
  const { overdue, thisMonthAll } = groupDeadlinesForCurrentMonth(active);
  const ids = new Set([...overdue, ...thisMonthAll].map((d) => d.id));
  return deadlines.filter((d) => d.isCompleted ? false : ids.has(d.id));
}
