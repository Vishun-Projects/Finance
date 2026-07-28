'use client';

import { Tag, ProsCons } from '@/features/money-plan/components/money-plan-inline-ui';
import { PlanCallout } from '@/features/money-plan/components/ui/plan-callout';
import { planIcons } from '@/features/money-plan/components/ui';
import { fmt } from '@/features/money-plan/data';
import { getSavingsInstruments } from '@/features/money-plan/data/money-plan-content';
import type { InstrumentPriority } from '@/features/money-plan/data/money-plan-content';
import { useScaledMoneyPlan } from '@/features/money-plan/context/scaled-money-plan-context';

const priorityColor: Record<InstrumentPriority, 'red' | 'yellow' | 'blue'> = {
  high: 'red',
  medium: 'yellow',
  low: 'blue',
};

const priorityLabel: Record<InstrumentPriority, string> = {
  high: 'Do Now',
  medium: 'Optional',
  low: 'Skip for now',
};

export function SavingsTab() {
  const plan = useScaledMoneyPlan();
  const instruments = getSavingsInstruments(plan);

  return (
    <div className="space-y-3">
      <PlanCallout variant="green" title="CA Rule — Emergency Fund First" icon={planIcons.info}>
        Target: <strong>₹1.5–2 Lakh</strong> liquid within 24 hrs. Monthly contribution: {fmt(plan.emergency)}/mo.
        At this rate, ₹1.5L ready in ~5 months. Park in IDFC First (7%) ya Liquid Fund.
      </PlanCallout>

      <div className="card-base overflow-hidden divide-y divide-border/60">
        {instruments.map((item) => (
          <div key={item.name} className="px-3 py-3.5 sm:px-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{item.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{item.where}</div>
              </div>
              <Tag color={priorityColor[item.priority]}>{priorityLabel[item.priority]}</Tag>
            </div>
            <div className="mb-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {(
                [
                  ['Return', item.rate],
                  ['Liquidity', item.liquidity],
                  ['Tax', item.taxed],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-md bg-surface px-2.5 py-1.5">
                  <div className="mb-0.5 text-[10px] text-hint">{k}</div>
                  <div className="text-xs font-medium text-foreground">{v}</div>
                </div>
              ))}
            </div>
            <div className="mb-2 text-xs leading-relaxed text-muted-foreground">{item.use}</div>
            <ProsCons pros={item.pros} cons={item.cons} />
          </div>
        ))}
      </div>
    </div>
  );
}
