'use client';

import { cn } from '@/lib/utils';
import type { AnalyticsGoalProjection } from '@/features/analytics/types';

function goalStatus(goal: AnalyticsGoalProjection): { label: string; tone: string } {
  if (!goal.reachable) return { label: 'Off track', tone: 'text-[var(--danger)] bg-[var(--danger)]/10' };
  if (goal.onTrack === false) return { label: 'At risk', tone: 'text-[var(--warning)] bg-[var(--warning)]/10' };
  return { label: 'On track', tone: 'text-[var(--success)] bg-[var(--success)]/10' };
}

export default function AnalyticsGoalStatusList({ goals }: { goals: AnalyticsGoalProjection[] }) {
  return (
    <ul className="space-y-2">
      {goals.map((goal) => {
        const status = goalStatus(goal);
        return (
          <li key={goal.id} className="rounded-lg border border-border/70 bg-card/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{goal.title}</p>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', status.tone)}>
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">{goal.note}</p>
          </li>
        );
      })}
    </ul>
  );
}
