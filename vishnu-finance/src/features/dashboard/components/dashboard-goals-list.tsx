'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Progress } from '@/components/ui/progress';
import type { GoalAdherence } from '@/lib/plan-adherence-service';
import { cn, formatRupees } from '@/lib/utils';

function goalStatusLabel(status: GoalAdherence['status']) {
  if (status === 'completed') return 'Completed';
  if (status === 'on_track') return 'On track';
  return 'Behind';
}

function goalStatusVariant(status: GoalAdherence['status']): 'success' | 'warning' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'on_track') return 'success';
  return 'warning';
}

export interface DashboardGoalRowMeta {
  detailLine?: string | null;
}

interface DashboardGoalsListProps {
  goals: GoalAdherence[];
  metaByGoalId?: Record<string, DashboardGoalRowMeta>;
  className?: string;
  dense?: boolean;
}

export function DashboardGoalsList({
  goals,
  metaByGoalId,
  className,
  dense = false,
}: DashboardGoalsListProps) {
  return (
    <section className={cn('card-base shrink-0', dense ? 'p-3' : 'p-4', className)}>
      <div className={cn('flex items-center justify-between gap-2', dense ? 'mb-2' : 'mb-3')}>
        <div>
          <h2 className="text-sm font-medium text-foreground">Goals tracker</h2>
          <p className="text-[10px] text-muted">Progress vs target pace</p>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link href="/plans">
            All plans
            <ArrowRight className="ml-1 size-3" />
          </Link>
        </Button>
      </div>
      {goals.length === 0 ? (
        <p className="text-xs text-muted">No active goals yet. Add goals on the Plans page.</p>
      ) : (
        <div className="divide-y divide-border/60">
          {goals.map((goal) => {
            const meta = metaByGoalId?.[goal.id];
            return (
              <div key={goal.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{goal.name}</p>
                    <p className="text-[10px] text-muted">
                      {formatRupees(goal.currentAmount)} of {formatRupees(goal.targetAmount)}
                    </p>
                    {meta?.detailLine ? (
                      <p className="mt-0.5 text-[10px] text-muted">{meta.detailLine}</p>
                    ) : null}
                    {goal.targetDate ? (
                      <p className="mt-0.5 text-[10px] text-muted">
                        Target {format(new Date(goal.targetDate), 'd MMM yyyy')}
                      </p>
                    ) : null}
                  </div>
                  <Chip variant={goalStatusVariant(goal.status)} className="shrink-0 text-[10px]">
                    {goalStatusLabel(goal.status)}
                  </Chip>
                </div>
                <Progress value={goal.progressPercent} className="h-1.5" />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
