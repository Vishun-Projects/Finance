'use client';

import { useState } from 'react';
import { Card, Tag, SectionTitle, icons } from '@/features/money-plan/components/money-plan-inline-ui';
import { PlanCallout } from '@/features/money-plan/components/ui/plan-callout';
import { planIcons } from '@/features/money-plan/components/ui';
import { fmt } from '@/features/money-plan/data';
import { useScaledMoneyPlan } from '@/features/money-plan/context/scaled-money-plan-context';
import {
  INSURANCE_PREMIUM_AGE_TABLE,
  RESEARCH_DECISIONS,
  RESEARCH_NEWS,
  RERESEARCH_SCHEDULE,
} from '@/features/money-plan/data/money-plan-content';
import { cn } from '@/lib/utils';

export function ResearchTab() {
  const plan = useScaledMoneyPlan();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div>
      <PlanCallout
        variant="orange"
        title={`Sister's Claim — "₹50k/month hai, bahut late ho gaya"`}
        className="mb-4"
      >
        <div className="mb-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-2">
            <div className="mb-1 text-[10px] font-medium text-red-600 dark:text-red-400">
              SISTER KI BAAT (Partial truth)
            </div>
            <div className="text-xs leading-relaxed text-red-700 dark:text-red-300">
              60+ pe ya pre-existing conditions ke saath ₹50k/month realistic hai. Urgency sahi hai.
            </div>
          </div>
          <div className="rounded-md border border-green-500/30 bg-green-500/10 px-2.5 py-2">
            <div className="mb-1 text-[10px] font-medium text-green-700 dark:text-green-400">
              REALITY AT {plan.parents.mummy} &amp; {plan.parents.papa} NOW
            </div>
            <div className="text-xs leading-relaxed text-green-800 dark:text-green-300">
              {fmt(plan.parentsMummy + plan.parentsPapa)}/mo combined (₹10L each individual). Already budgeted in
              Overview.
            </div>
          </div>
        </div>
        <strong>Verdict:</strong> Urgency sahi hai — premium number galat hai. ₹50k/month = age 65–70 scenario.
        See Decision Log #1 for full breakdown.
      </PlanCallout>

      <PlanCallout
        variant="green"
        title="All tabs are in sync"
        icon={planIcons.info}
        className="mb-4"
      >
        Every rupee figure scales with your take-home. SIP = {fmt(plan.sip)}/mo · PPF = {fmt(plan.ppf)}/mo ·
        Stocks = {fmt(plan.stocks)}/mo · Insurance = {fmt(plan.budget.insurance.amount)}/mo total (Mummy{' '}
        {fmt(plan.parentsMummy)} + Papa {fmt(plan.parentsPapa)} + Term {fmt(plan.termPremium)} + Health{' '}
        {fmt(plan.ownHealth)} + PA {fmt(plan.pacover)} + Buffer {fmt(plan.insuranceBuffer)}). Update salary on the
        Salary page to rescale the plan.
      </PlanCallout>

      <SectionTitle>Decision Log — {RESEARCH_DECISIONS.length} Decisions Researched</SectionTitle>
      {RESEARCH_DECISIONS.map((d) => {
        const isOpen = open === d.id;
        return (
          <div
            key={d.id}
            onClick={() => setOpen(isOpen ? null : d.id)}
            className={cn(
              'mb-2.5 cursor-pointer rounded-[10px] border px-[18px] py-3.5',
              d.id === 'd0'
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-border bg-card',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Tag color={d.tagColor}>{d.tag}</Tag>
                <span className="truncate text-[13px] font-medium text-foreground">{d.topic}</span>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  'ml-2 shrink-0 text-hint transition-transform duration-200',
                  isOpen && 'rotate-180',
                )}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {isOpen && (
              <div className="mt-3.5 border-t border-border pt-3.5">
                <div className="mb-3">
                  <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-hint">
                    Final Decision
                  </div>
                  <div className="rounded-md border border-green-500/30 bg-green-500/10 px-2.5 py-2 text-[13px] font-medium text-green-700 dark:text-green-400">
                    {d.decision}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-hint">
                    Reasoning
                  </div>
                  {d.reasoning.map((r, i) => (
                    <div key={i} className="mb-1.5 flex gap-2">
                      <span className="mt-0.5 shrink-0 text-[11px] text-hint">→</span>
                      <span className="text-xs leading-relaxed text-muted-foreground">{r}</span>
                    </div>
                  ))}
                </div>
                {d.alternatives ? (
                  <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2">
                    <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Alternatives: </span>
                    <span className="text-xs text-amber-800 dark:text-amber-300">{d.alternatives}</span>
                  </div>
                ) : null}
                {d.sources.length > 0 ? (
                  <div>
                    <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-hint">
                      Sources
                    </div>
                    {d.sources.map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mb-1 flex items-center gap-1.5 text-xs text-blue-600 no-underline hover:underline dark:text-blue-400"
                      >
                        {icons.link}
                        {s.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}

      <SectionTitle>Parents Insurance — What the Premium Looks Like by Age</SectionTitle>
      <Card className="mb-4">
        <div className="mb-3 text-xs text-muted-foreground">
          ₹10L individual cover per person — cost at different ages:
        </div>
        {INSURANCE_PREMIUM_AGE_TABLE.map((row, i) => (
          <div
            key={row.age}
            className={cn(
              'py-2 md:grid md:grid-cols-[100px_1fr_1fr_1fr] md:items-center md:gap-2',
              i < INSURANCE_PREMIUM_AGE_TABLE.length - 1 && 'border-b border-border',
            )}
          >
            <div className="mb-2 flex items-center justify-between md:mb-0 md:block">
              <div className="text-[11px] font-medium" style={{ color: row.col }}>
                Age {row.age}
              </div>
              <div className="text-[11px] font-medium md:hidden" style={{ color: row.col }}>
                {row.note}
              </div>
            </div>
            <div className="space-y-1 md:space-y-0">
              <div className="flex justify-between gap-2 text-[11px] md:block md:text-muted-foreground">
                <span className="text-hint md:hidden">Mummy</span>
                <span>{row.mummy}</span>
              </div>
              <div className="flex justify-between gap-2 text-[11px] md:block md:text-muted-foreground">
                <span className="text-hint md:hidden">Papa</span>
                <span>{row.papa}</span>
              </div>
            </div>
            <div className="hidden text-[11px] font-medium md:block" style={{ color: row.col }}>
              {row.note}
            </div>
          </div>
        ))}
      </Card>

      <SectionTitle>Reference Links — Bookmark These</SectionTitle>
      {RESEARCH_NEWS.map((cat) => (
        <Card key={cat.category} className="mb-3">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
            {icons.newspaper} {cat.category}
          </div>
          {cat.items.map((item, j) => (
            <div
              key={item.url}
              className={cn('py-2', j < cat.items.length - 1 && 'border-b border-border')}
            >
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[13px] font-medium text-blue-600 no-underline hover:underline dark:text-blue-400"
              >
                {icons.link}
                {item.name}
              </a>
              <div className="mt-0.5 text-[11px] text-hint">{item.desc}</div>
            </div>
          ))}
        </Card>
      ))}

      <Card className="mt-2 bg-surface">
        <div className="mb-2 text-xs font-medium text-foreground">When to Re-research</div>
        {RERESEARCH_SCHEDULE.map(({ when, what }, i) => (
          <div
            key={when}
            className={cn(
              'flex flex-wrap gap-x-3 gap-y-1.5 py-1.5',
              i < RERESEARCH_SCHEDULE.length - 1 && 'border-b border-border',
            )}
          >
            <span className="min-w-[120px] shrink-0 text-xs font-medium text-muted-foreground sm:min-w-[140px]">{when}</span>
            <span className="text-xs text-hint">{what}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
