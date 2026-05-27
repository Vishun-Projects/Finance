'use client';

import { Callout } from '@/components/ui/callout';
import { planIcons } from '@/features/money-plan/components/ui';
import type { InsurancePlan } from '@/features/money-plan/data/money-plan-content';
interface ClaimBlockProps {
  plan: InsurancePlan;
}

export function ClaimBlock({ plan }: ClaimBlockProps) {
  const showCashless = plan.id !== 'term' && plan.id !== 'pa';

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.06em] text-hint">
        {planIcons.clock} How to Claim
      </div>

      {showCashless && (
        <>
          <div className="mb-1.5 text-xs font-medium text-[var(--success)]">
            Cashless (Network Hospital)
          </div>
          {plan.claimProcess.cashless.steps.map((s, i) => (
            <div key={i} className="mb-1 flex gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-[10px] font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-xs leading-relaxed text-foreground">{s}</span>
            </div>
          ))}
          <Callout variant="success" title="Tip" className="mb-3 mt-1.5 px-2.5 py-1.5">
            {plan.claimProcess.cashless.tip}
          </Callout>
          <div className="mb-1.5 text-xs font-medium text-[var(--info)]">
            Reimbursement (Any Hospital)
          </div>
        </>
      )}

      {!showCashless && (
        <div className="mb-1.5 text-xs font-medium text-[var(--info)]">Claim Process</div>
      )}

      {plan.claimProcess.reimbursement.steps.map((s, i) => (
        <div key={i} className="mb-1 flex gap-2">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--info)] text-[10px] font-semibold text-primary-foreground">
            {i + 1}
          </span>
          <span className="text-xs leading-relaxed text-foreground">{s}</span>
        </div>
      ))}

      <Callout variant="info" title="Tip" className="mb-3 mt-1.5 px-2.5 py-1.5">
        {plan.claimProcess.reimbursement.tip}
      </Callout>

      <div className="mb-2.5 grid grid-cols-2 gap-1.5">
        <div className="rounded-md bg-surface px-2.5 py-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] text-hint">
            {planIcons.clock} Settlement Time
          </div>
          <div className="text-[11px] leading-snug text-foreground">{plan.claimProcess.timeline}</div>
        </div>
        <div className="rounded-md bg-surface px-2.5 py-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] text-hint">
            {planIcons.rupee} Tax Benefit
          </div>
          <div className="text-[11px] leading-snug text-foreground">{plan.claimProcess.taxBenefit}</div>
        </div>
      </div>

      <div className="mb-1 flex items-center gap-1 text-[11px] text-hint">
        {planIcons.phone} Helplines
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(plan.claimProcess.helplines).map(([name, num]) => (
          <div key={name} className="rounded bg-surface px-2.5 py-1 text-[11px]">
            <span className="font-medium text-muted">{name}: </span>
            <span className="text-foreground">{num}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
