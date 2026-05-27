'use client';

import { planIcons } from '@/features/money-plan/components/ui';
import type { InsurancePlan } from '@/features/money-plan/data/money-plan-content';

const COVERAGE_LABELS: Record<string, string> = {
  sumInsured: 'Sum Insured',
  roomRent: 'Room Rent',
  icu: 'ICU',
  preHosp: 'Pre-Hosp',
  postHosp: 'Post-Hosp',
  daycare: 'Daycare',
  restoration: 'Restoration',
  ambulance: 'Ambulance',
  domiciliary: 'Domiciliary',
  ayush: 'AYUSH',
  annualCheckup: 'Health Checkup',
  coPay: 'Co-Payment',
  pedWait: 'PED Wait',
  maternity: 'Maternity',
  mentalHealth: 'Mental Health',
  dental: 'Dental',
  vision: 'Vision',
  cumulativeBonus: 'Cumul. Bonus',
  wellnessDiscount: 'Wellness Disc.',
  coPayment: 'Co-Payment',
  lockTheClock: 'Lock the Clock',
  deathBenefit: 'Death Benefit',
  accidentalDeath: 'Accidental Death',
  terminalIllness: 'Terminal Illness',
  criticalIllness: 'Critical Illness',
  waiver: 'Prem. Waiver',
  policyTerm: 'Policy Term',
  maturity: 'Maturity',
  permanentTotalDisability: 'Perm. Total Dis.',
  permanentPartialDisability: 'Perm. Partial Dis.',
  temporaryTotalDisability: 'Temp. Total Dis.',
  hospitalisationExpense: 'Hospitalisation',
  transportOfRemains: 'Mortal Remains',
};

interface CoverageBlockProps {
  plan: InsurancePlan;
}

export function CoverageBlock({ plan }: CoverageBlockProps) {
  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.06em] text-hint">
        {planIcons.hospital} What&apos;s Covered
      </div>
      <div className="mb-2.5 grid grid-cols-2 gap-1.5">
        {Object.entries(plan.coverageDetails).map(([k, v]) => (
          <div key={k} className="rounded-md bg-surface px-2.5 py-1.5">
            <div className="mb-0.5 text-[10px] text-hint">
              {COVERAGE_LABELS[k] || k}
            </div>
            <div className="text-[11px] leading-snug text-foreground">{v}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-[var(--danger)]">
          {planIcons.x} Not Covered
        </div>
        <div className="grid grid-cols-2 gap-1">
          {plan.notCovered.map((item) => (
            <div
              key={item}
              className="flex items-start gap-1 rounded bg-[var(--danger-bg)] px-1.5 py-1 text-[11px] text-[var(--callout-danger-fg)]"
            >
              <span className="mt-0.5 shrink-0">{planIcons.x}</span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
