'use client';

import { useMemo, useState } from 'react';
import { Callout } from '@/components/ui/callout';
import {
  PlanCard,
  PlanCallout,
  PlanTag,
  planIcons,
} from '@/features/money-plan/components/ui';
import { DATA, fmt } from '@/features/money-plan/data';
import { getInsurancePlans } from '@/features/money-plan/data/money-plan-content';
import type { InsurancePriority } from '@/features/money-plan/data/money-plan-content';
import { useScaledMoneyPlan } from '@/features/money-plan/context/scaled-money-plan-context';
import { ClaimBlock } from './claim-block';
import { CoverageBlock } from './coverage-block';
import { cn } from '@/lib/utils';

const priorityColor: Record<InsurancePriority, 'red' | 'yellow' | 'blue'> = {
  URGENT: 'red',
  HIGH: 'yellow',
  MEDIUM: 'blue',
};

type SnapshotVariant = 'danger' | 'warning' | 'info' | 'foreground';

const snapshotTextClass: Record<SnapshotVariant, string> = {
  danger: 'text-[var(--danger)]',
  warning: 'text-[var(--warning)]',
  info: 'text-[var(--info)]',
  foreground: 'text-foreground',
};

export function InsuranceTab() {
  const plan = useScaledMoneyPlan();
  const [openClaim, setOpenClaim] = useState<string | null>(null);
  const [openCoverage, setOpenCoverage] = useState<string | null>(null);

  const plans = useMemo(() => getInsurancePlans(plan), [plan]);

  const premiums = {
    parentsMummy: plan.parentsMummy,
    parentsPapa: plan.parentsPapa,
    term: plan.termPremium,
    ownHealth: plan.ownHealth,
    pa: plan.pacover,
  };
  const totalMonthly = Object.values(premiums).reduce((s, v) => s + v, 0);

  const snapshotItems: Array<{
    label: string;
    cover: string;
    monthly: string;
    variant: SnapshotVariant;
  }> = [
    {
      label: `Mummy Health (age ${plan.parents.mummy})`,
      cover: '₹10L',
      monthly: fmt(premiums.parentsMummy),
      variant: 'danger',
    },
    {
      label: `Papa Health (age ${plan.parents.papa})`,
      cover: '₹10L',
      monthly: fmt(premiums.parentsPapa),
      variant: 'danger',
    },
    {
      label: 'Term Life (Vishnu)',
      cover: '₹1 Crore',
      monthly: fmt(premiums.term),
      variant: 'warning',
    },
    {
      label: 'Own Health (Vishnu)',
      cover: '₹5L → ₹25L',
      monthly: fmt(premiums.ownHealth),
      variant: 'warning',
    },
    {
      label: 'Personal Accident',
      cover: '₹25–50L',
      monthly: fmt(premiums.pa),
      variant: 'info',
    },
    {
      label: 'Total Insurance Budget',
      cover: `${fmt(totalMonthly)}/mo`,
      monthly: `${fmt(totalMonthly * 12)}/yr`,
      variant: 'foreground',
    },
  ];

  return (
    <div>
      <PlanCallout
        variant="red"
        title={`Parents — Mummy ${plan.parents.mummy} · Papa ${plan.parents.papa} — Golden Window`}
        icon={planIcons.alert}
        className="mb-4"
      >
        60+ ke baad premium 2–3x ho jaata hai. ICU week metro mein = ₹3–5L+. Individual policies
        lo. Budget mein already {fmt(premiums.parentsMummy + premiums.parentsPapa)}/mo set hai.
      </PlanCallout>

      <PlanCard className="mb-4 bg-surface">
        <div className="mb-2.5 text-[13px] font-medium text-foreground">
          Your Insurance Cover — All Policies at a Glance
        </div>
        <div className="grid grid-cols-2 gap-2">
          {snapshotItems.map((item, i) => (
            <div
              key={item.label}
              className="rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <div className="mb-1 text-[11px] text-hint">{item.label}</div>
              <div className={cn('text-sm font-semibold', snapshotTextClass[item.variant])}>
                {item.cover}
              </div>
              <div className="mt-0.5 text-[11px] text-hint">
                {item.monthly}
                {i < 5 ? ' /mo' : ''}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 border-t border-border pt-2 text-[11px] text-hint">
          ✓ These figures match the Overview breakdown exactly. Buffer {fmt(plan.insuranceBuffer)}/mo
          kept for renewal hikes.
        </div>
      </PlanCard>

      {plans.map((plan) => (
        <PlanCard key={plan.id} className="mb-3.5">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">{plan.type}</div>
              <div className="mt-0.5 text-[11px] text-hint">{plan.subtitle}</div>
            </div>
            <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
              <PlanTag color={priorityColor[plan.priority]}>{plan.priority}</PlanTag>
              <span className="text-xs font-medium text-foreground">{plan.amount}</span>
            </div>
          </div>

          {plan.amountMummy && plan.amountPapa && (
            <div className="my-2 grid grid-cols-2 gap-1.5">
              <div className="rounded-md bg-[var(--danger-bg)] px-2.5 py-1.5">
                <div className="mb-0.5 text-[10px] text-hint">
                  Mummy (age {plan.parents.mummy})
                </div>
                <div className="text-xs font-medium text-[var(--danger)]">{plan.amountMummy}</div>
              </div>
              <div className="rounded-md bg-[var(--danger-bg)] px-2.5 py-1.5">
                <div className="mb-0.5 text-[10px] text-hint">
                  Papa (age {plan.parents.papa})
                </div>
                <div className="text-xs font-medium text-[var(--danger)]">{plan.amountPapa}</div>
              </div>
            </div>
          )}

          <div className="my-2.5 flex items-center justify-between rounded-md bg-surface px-2.5 py-2">
            <div>
              <span className="text-[11px] text-hint">Cover: </span>
              <span className="text-[13px] font-semibold text-foreground">{plan.cover}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpenCoverage(openCoverage === plan.id ? null : plan.id)}
                className={cn(
                  'cursor-pointer rounded border border-border px-2.5 py-1 text-[11px] font-medium',
                  openCoverage === plan.id
                    ? 'bg-foreground text-primary-foreground'
                    : 'bg-card text-muted'
                )}
              >
                {openCoverage === plan.id ? 'Hide' : 'View Coverage'}
              </button>
              <button
                type="button"
                onClick={() => setOpenClaim(openClaim === plan.id ? null : plan.id)}
                className={cn(
                  'cursor-pointer rounded border border-border px-2.5 py-1 text-[11px] font-medium',
                  openClaim === plan.id
                    ? 'bg-[var(--info)] text-primary-foreground'
                    : 'bg-card text-muted'
                )}
              >
                {openClaim === plan.id ? 'Hide' : 'How to Claim'}
              </button>
            </div>
          </div>

          {openCoverage === plan.id && <CoverageBlock plan={plan} />}
          {openClaim === plan.id && <ClaimBlock plan={plan} />}

          {plan.familyFloaterNote && (
            <Callout variant="warning" title="Family Floater" className="mb-2.5 px-2.5 py-1.5">
              {plan.familyFloaterNote}
            </Callout>
          )}

          <div className="mb-1.5 mt-2.5 text-[11px] uppercase tracking-[0.06em] text-hint">
            Plan Options
          </div>
          {plan.options.map((opt) => (
            <div
              key={opt.name}
              className={cn(
                'mb-2 rounded-lg border px-3 py-2.5',
                opt.highlight
                  ? 'border-[var(--success-border)] bg-[var(--success-bg)]'
                  : 'border-border bg-card'
              )}
            >
              <div className="flex justify-between">
                <div
                  className={cn(
                    'text-[13px] font-medium',
                    opt.highlight ? 'text-[var(--success)]' : 'text-foreground'
                  )}
                >
                  {opt.highlight ? '★ ' : ''}
                  {opt.name}
                </div>
                <span className="ml-2 text-[11px] text-hint">{opt.premium}</span>
              </div>
              <div
                className={cn(
                  'mt-1 text-xs leading-relaxed',
                  opt.highlight ? 'text-[var(--callout-success-fg)]' : 'text-muted'
                )}
              >
                {opt.note}
              </div>
              <div className="mt-1 text-[11px] text-hint">CSR: {opt.csr}</div>
            </div>
          ))}

          <Callout variant="warning" title="CA Note" icon={planIcons.info} className="mt-1 px-2.5 py-2">
            {plan.caNote}
          </Callout>
        </PlanCard>
      ))}

      <PlanCard className="border-[var(--purple-border)] bg-[var(--purple-bg)]">
        <div className="mb-2 text-xs font-medium text-[var(--callout-purple-title)]">
          CSR — Claim Settlement Ratio kya hota hai?
        </div>
        <div className="text-xs leading-relaxed text-[var(--callout-purple-fg)]">
          CSR = out of 100 claims filed, kitne settle hue.
          <br />
          <strong>{DATA.maxLifeCSR} (Max Life)</strong> = sirf 0.38 claims out of 100 reject hue.
          <br />
          <strong>Claims reject kyun hote hain:</strong> non-disclosure of illness at policy start,
          exclusion period violations, fraud.
          <br />
          <strong>Avoid karo:</strong> Always disclose smoking, pre-existing conditions honestly at
          buying. Tab claim nahi rokega koi.
        </div>
      </PlanCard>
    </div>
  );
}
