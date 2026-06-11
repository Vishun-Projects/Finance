'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TakeHomeAnchor } from '@/components/finance/take-home-anchor';
import { formatRupees } from '@/lib/utils';
import type { PlanIncomeSource } from '@/lib/plan-income';

export interface PlanPreviewData {
  takeHome: number;
  source: PlanIncomeSource;
  activeSalaryTakeHome?: number | null;
  currentMonthSalaryReceived?: number;
  lastMonthSalaryReceived?: number;
  receivedSalaryAnchor?: number;
  receivedSalarySource?: 'current_month' | 'last_month' | 'none';
  plannedTotal: number;
  actualTotal: number;
  headroom: number;
  underspend: number;
  available: number;
  overallScore: number;
  monthLabel: string;
}

interface SalaryPlanPreviewCardProps {
  preview: PlanPreviewData | null;
  loading?: boolean;
}

export function SalaryPlanPreviewCard({ preview, loading }: SalaryPlanPreviewCardProps) {
  if (loading) {
    return (
      <section className="card-base p-4">
        <p className="text-xs text-muted">Loading plan preview…</p>
      </section>
    );
  }

  if (!preview) {
    return null;
  }

  return (
    <section className="card-base space-y-4 p-4">
      <div>
        <h2 className="text-sm font-medium text-foreground">Your plan at this salary</h2>
        <p className="mt-1 text-xs text-muted">
          How your take-home flows into the phase plan and this month&apos;s actuals ({preview.monthLabel}).
        </p>
      </div>

      <TakeHomeAnchor
        baseIncome={preview.takeHome}
        source={preview.source}
        variant="compact"
        showEditLink={false}
        activeSalaryTakeHome={preview.activeSalaryTakeHome}
        currentMonthSalaryReceived={preview.currentMonthSalaryReceived}
        lastMonthSalaryReceived={preview.lastMonthSalaryReceived}
        receivedSalarySource={preview.receivedSalarySource}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-border bg-surface/40 p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Planned/mo</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{formatRupees(preview.plannedTotal)}</p>
        </div>
        <div className="rounded-md border border-border bg-surface/40 p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Spent so far</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{formatRupees(preview.actualTotal)}</p>
        </div>
        <div className="rounded-md border border-border bg-surface/40 p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Headroom</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--success)]">
            {formatRupees(preview.headroom)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface/40 p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Plan score</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{preview.overallScore}%</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/phase-plan"
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface"
        >
          View phase plan
          <ArrowRight className="size-3" />
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface"
        >
          See this month on dashboard
          <ArrowRight className="size-3" />
        </Link>
        <Link
          href="/plans"
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface"
        >
          Fund goals from headroom
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </section>
  );
}
