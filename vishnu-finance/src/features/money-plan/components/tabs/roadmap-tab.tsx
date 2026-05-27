'use client';

import { useState } from 'react';
import { Card, icons } from '@/features/money-plan/components/money-plan-inline-ui';
import { fmt } from '@/features/money-plan/data';
import { useScaledMoneyPlan } from '@/features/money-plan/context/scaled-money-plan-context';
import { ROADMAP_MONTHS } from '@/features/money-plan/data/money-plan-content';
import { cn } from '@/lib/utils';

export function RoadmapTab() {
  const plan = useScaledMoneyPlan();
  const [done, setDone] = useState<Record<string, boolean>>({});

  const total = ROADMAP_MONTHS.flatMap((m) => m.tasks).length;
  const doneCount = Object.values(done).filter(Boolean).length;
  const toggle = (id: string) => setDone((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div>
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13px] font-medium text-foreground">Progress</div>
          <div className="text-xs text-muted-foreground">
            {doneCount}/{total} tasks
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded bg-surface">
          <div
            className="h-full rounded bg-foreground transition-[width] duration-300"
            style={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%` }}
          />
        </div>
      </Card>

      {ROADMAP_MONTHS.map((month) => (
        <Card key={month.label} className="mb-3">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-muted-foreground">{icons.calendar}</span>
            <div className="text-[13px] font-medium text-foreground">{month.label}</div>
          </div>
          {month.tasks.map((task, i) => (
            <div
              key={task.id}
              onClick={() => toggle(task.id)}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 py-2',
                i < month.tasks.length - 1 && 'border-b border-border',
              )}
            >
              <div
                className={cn(
                  'mt-px flex size-4 shrink-0 items-center justify-center rounded',
                  done[task.id]
                    ? 'bg-foreground'
                    : 'border-[1.5px] border-border bg-transparent',
                )}
              >
                {done[task.id] && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-background">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span
                  className={cn(
                    'text-[13px]',
                    done[task.id]
                      ? 'text-hint line-through'
                      : 'text-foreground',
                  )}
                >
                  {task.text}
                </span>
                {task.urgent && !done[task.id] && (
                  <span className="ml-2 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                    urgent
                  </span>
                )}
              </div>
            </div>
          ))}
        </Card>
      ))}

      <Card className="bg-surface">
        <div className="mb-2.5 text-[13px] font-medium text-foreground">The One Rule</div>
        <div className="text-[13px] leading-relaxed text-muted-foreground">
          Har appraisal/increment ka <strong className="text-foreground">80% investments mein</strong>, 20% lifestyle.
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
          {(
            [
              [`Age ${plan.age}`, `${fmt(plan.sip)} SIP start`],
              ['Age 30', plan.sipProjection30],
              ['Age 40', plan.sipProjection40],
            ] as const
          ).map(([age, val]) => (
            <div
              key={age}
              className="rounded-lg border border-border bg-card px-2 py-2.5 text-center"
            >
              <div className="text-[11px] text-hint">{age}</div>
              <div className="mt-0.5 text-xs font-medium text-foreground">{val}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
