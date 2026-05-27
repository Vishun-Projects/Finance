'use client';

import { Card, Tag, ProsCons, icons } from '@/features/money-plan/components/money-plan-inline-ui';
import { PlanCallout } from '@/features/money-plan/components/ui/plan-callout';
import { planIcons } from '@/features/money-plan/components/ui';
import { fmt } from '@/features/money-plan/data';
import { getInvestmentInstruments } from '@/features/money-plan/data/money-plan-content';
import type { InstrumentPriority } from '@/features/money-plan/data/money-plan-content';
import { useScaledMoneyPlan } from '@/features/money-plan/context/scaled-money-plan-context';

const priorityColor: Record<InstrumentPriority, 'green' | 'yellow' | 'blue'> = {
  high: 'green',
  medium: 'yellow',
  low: 'blue',
};

const priorityLabel: Record<InstrumentPriority, string> = {
  high: 'Do Now',
  medium: 'Do Soon',
  low: 'Plan Later',
};

const avoidItems = [
  ['LIC Endowment / Money Back', 'Returns 4–5%. Agent ka commission, tera nahi.'],
  ['ULIPs', '2–4% charges, lock-in, poor returns.'],
  ['Chit Funds / P2P apps', 'Unregulated. Capital loss possible.'],
  ['Small Finance Bank FDs', 'DICGC covers only ₹5L. Stick to big banks.'],
] as const;

export function InvestmentsTab() {
  const plan = useScaledMoneyPlan();
  const instruments = getInvestmentInstruments(plan);

  return (
    <div>
      <PlanCallout
        variant="blue"
        title="CA Rule — SIP Kabhi Band Mat Karna"
        icon={planIcons.info}
        className="mb-4"
      >
        Market girne pe SIP band karna = sabse bada galti.{' '}
        <strong>
          {fmt(plan.sip)}/mo SIP age {plan.age} → ~{plan.sipProjection40} at 40 (12% assumed)
        </strong>
      </PlanCallout>

      {instruments.map((item) => (
        <Card key={item.name} className="mb-3">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">{item.name}</div>
              <div className="mt-0.5 text-[11px] text-hint">{item.type}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Tag color={priorityColor[item.priority]}>{priorityLabel[item.priority]}</Tag>
              <span className="text-xs font-medium text-foreground">{item.amount}</span>
            </div>
          </div>
          <div className="mb-2.5 grid grid-cols-2 gap-1.5">
            {(
              [
                ['Platform', item.platform],
                ['Returns', item.returns],
                ['Risk', item.risk],
                ['Lock-in', item.lock],
                ['Expense', item.expense],
                ['Tax', item.tax],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-md bg-surface px-2.5 py-1.5">
                <div className="mb-0.5 text-[10px] text-hint">{k}</div>
                <div className="text-[11px] text-foreground">{v}</div>
              </div>
            ))}
          </div>
          <div className="mb-2 rounded-md bg-surface px-2.5 py-2 text-xs leading-relaxed text-foreground">
            <span className="font-medium">CA View: </span>
            {item.verdict}
          </div>
          <ProsCons pros={item.pros} cons={item.cons} />
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Recommended: </span>
            {item.recommended}
          </div>
        </Card>
      ))}

      <PlanCallout variant="red" title="Avoid — CA Warning" icon={icons.x} className="mb-3">
        {avoidItems.map(([name, reason], i) => (
          <div key={name} className={i < avoidItems.length - 1 ? 'mb-2' : undefined}>
            <span className="font-medium">{name} — </span>
            {reason}
          </div>
        ))}
      </PlanCallout>
    </div>
  );
}
