'use client';

import { fmt } from '@/features/money-plan/data';
import { Card, SectionTitle, icons } from '@/features/money-plan/components/money-plan-inline-ui';
import { PlanCallout } from '@/features/money-plan/components/ui/plan-callout';
import { useScaledMoneyPlan } from '@/features/money-plan/context/scaled-money-plan-context';
import { cn } from '@/lib/utils';

const catColor: Record<string, string> = {
  needs: '#2563eb',
  wants: '#7c3aed',
  emi: '#dc2626',
  invest: '#16a34a',
  insurance: '#b45309',
};

const catLabel: Record<string, string> = {
  needs: 'Needs',
  wants: 'Wants',
  emi: 'EMI',
  invest: 'Invest',
  insurance: 'Insurance',
};

export function OverviewTab() {
  const plan = useScaledMoneyPlan();
  const budgetBars = Object.values(plan.budget).map((b) => ({
    label: b.label,
    amount: b.amount,
    pct: b.pct,
    col:
      b.variant === 'needs'
        ? '#2563eb'
        : b.variant === 'wants'
          ? '#7c3aed'
          : b.variant === 'emi'
            ? '#dc2626'
            : b.variant === 'invest'
              ? '#16a34a'
              : '#b45309',
  }));
  const bd = plan.breakdown;
  const total = plan.plannedTotal;

  return (
    <div>
      <Card className="mb-4">
        <p className="mb-1 text-xs text-muted-foreground">Monthly In-Hand</p>
        <p className="mb-3 text-[28px] font-medium tabular-nums text-foreground">{fmt(plan.salary)}</p>
        <div className="mb-3 flex h-2 gap-0.5 overflow-hidden rounded-md">
          {budgetBars.map((b) => (
            <div key={b.label} style={{ width: `${b.pct}%`, background: b.col }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {budgetBars.map((b) => (
            <div key={b.label} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="inline-block size-2 rounded-sm" style={{ background: b.col }} />
              {b.label} — {fmt(b.amount)} ({b.pct}%)
            </div>
          ))}
        </div>
      </Card>

      <PlanCallout
        variant="yellow"
        title="CA Advisory — EMI ends, SIP badhao"
        icon={icons.alert}
        className="mb-4"
      >
        Jab tera EMI khatam ho, wo {fmt(plan.budget.emi.amount)} seedha SIP mein daal. SIP {fmt(plan.postEmiSip)}
        /mo ho jaayega. Age {plan.age} pe start kiya {fmt(plan.sip)} SIP → 40 pe ~{plan.sipProjection40} (12%
        assumed).
      </PlanCallout>

      <PlanCallout
        variant="orange"
        title="Insurance Budget Note"
        icon={icons.info}
        className="mb-4"
      >
        Parents insurance is split: Mummy {fmt(plan.parentsMummy)}/mo + Papa {fmt(plan.parentsPapa)}/mo ={' '}
        {fmt(plan.parentsMummy + plan.parentsPapa)}/mo. Real market rate for ₹10L cover each at age 52 & 55. See
        Insurance tab for plan options.
      </PlanCallout>

      <SectionTitle>Full Breakdown — {fmt(total)}/mo</SectionTitle>
      <Card>
        {bd.map((r, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center justify-between py-2.5',
              i < bd.length - 1 && 'border-b border-border',
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: `${catColor[r.cat]}22`,
                  color: catColor[r.cat],
                }}
              >
                {catLabel[r.cat]}
              </span>
              <span className="truncate text-[13px] text-foreground">{r.label}</span>
            </div>
            <span className="shrink-0 pl-2 text-[13px] font-medium tabular-nums text-foreground">{fmt(r.amount)}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between border-t-2 border-foreground pt-3">
          <span className="text-[13px] font-medium text-foreground">Total</span>
          <span
            className={cn(
              'text-[13px] font-medium tabular-nums',
              total === plan.salary ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
            )}
          >
            {fmt(total)}
            {total === plan.salary
              ? ' ✓'
              : ` (${total > plan.salary ? 'over' : 'under'} by ${fmt(Math.abs(total - plan.salary))})`}
          </span>
        </div>
      </Card>
    </div>
  );
}
