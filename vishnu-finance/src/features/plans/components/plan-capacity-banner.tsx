'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  formatDisciplineCurrency,
  type DisciplineSummary,
} from '@/lib/plans-discipline';
import { TakeHomeAnchor } from '@/components/finance/take-home-anchor';
import {
  receivedSalarySourceLabel,
  type PlanIncomeContext,
  type PlanIncomeSource,
} from '@/lib/plan-income';

interface PlanCapacityBannerProps {
  summary: DisciplineSummary;
  planIncomeContext?: PlanIncomeContext;
  planIncomeSource?: PlanIncomeSource;
  className?: string;
}

function statusTone(status: DisciplineSummary['status']) {
  switch (status) {
    case 'ok':
      return 'border-[var(--success)]/30 bg-[var(--success)]/5';
    case 'tight':
      return 'border-[var(--warning)]/30 bg-[var(--warning)]/5';
    case 'overcommitted':
      return 'border-[var(--danger)]/30 bg-[var(--danger)]/5';
    default:
      return 'border-border bg-surface';
  }
}

function statusMessage(summary: DisciplineSummary) {
  const { gap, status, capacity } = summary;
  const incomeGap = capacity.planBaseIncome - capacity.monthlyIncome;
  const incomeNote =
    incomeGap > 1000
      ? ` Plan is ₹${Math.round(incomeGap).toLocaleString('en-IN')}/mo; you've received ₹${Math.round(capacity.monthlyIncome).toLocaleString('en-IN')} credited so far — capacity is capped to that.`
      : '';

  if (status === 'overcommitted') {
    return `You need ${formatDisciplineCurrency(Math.abs(gap))} more per month than your fundable capacity.${incomeNote}`;
  }
  if (status === 'tight') {
    return `Only ${formatDisciplineCurrency(gap)} left after goals, dues & wishlist.${incomeNote}`;
  }
  return `${formatDisciplineCurrency(gap)} left for goals after commitments (from ${formatDisciplineCurrency(capacity.available)} fundable this month).${incomeNote}`;
}

export function PlanCapacityBanner({
  summary,
  planIncomeContext,
  planIncomeSource,
  className,
}: PlanCapacityBannerProps) {
  const { capacity, totalRequiredPerMonth, gap, status } = summary;
  const takeHome = capacity.planBaseIncome;
  const incomeSource =
    planIncomeContext?.planScale.source ?? planIncomeSource ?? capacity.planIncomeSource ?? 'default';
  const receivedAnchor = planIncomeContext?.receivedSalaryAnchor ?? capacity.monthlyIncome;
  const receivedSource = planIncomeContext?.receivedSalarySource;

  return (
    <section className={cn('card-base space-y-4 p-4', statusTone(status), className)}>
      <TakeHomeAnchor
        baseIncome={takeHome}
        source={incomeSource}
        variant="compact"
        className="-mt-1"
        activeSalaryTakeHome={planIncomeContext?.activeSalaryTakeHome}
        currentMonthSalaryReceived={planIncomeContext?.currentMonthSalaryReceived}
        lastMonthSalaryReceived={planIncomeContext?.lastMonthSalaryReceived}
        receivedSalarySource={receivedSource}
      />
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">How your budget and commitments fit</h2>
        <p className="text-xs leading-relaxed text-muted">
          Your <strong className="font-medium text-foreground">income budget</strong> splits{' '}
          <strong className="font-medium text-foreground">{formatDisciplineCurrency(takeHome)}</strong> take-home
          into spending categories you define (e.g. 50 · 30 · 20).{' '}
          <strong className="font-medium text-foreground">Goals, dues, and wishlist</strong> are tracked separately
          — fund them from income left after budget spend.
        </p>
        {receivedAnchor + 500 < capacity.planBaseIncome && (
          <p className="text-xs text-[var(--warning)]">
            Salary credited {formatDisciplineCurrency(receivedAnchor)}
            {receivedSource && receivedSource !== 'none'
              ? ` (${receivedSalarySourceLabel(receivedSource)})`
              : ''}{' '}
            vs {formatDisciplineCurrency(capacity.planBaseIncome)} plan take-home — fundable capacity uses what
            you&apos;ve actually been paid.
          </p>
        )}
        {capacity.planSlack > capacity.available + 500 && (
          <p className="text-xs text-muted">
            Unspent plan budget: {formatDisciplineCurrency(capacity.planSlack)} — but only{' '}
            {formatDisciplineCurrency(capacity.available)} is backed by income received so far.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-md border border-border bg-card/60 p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Headroom</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{formatDisciplineCurrency(capacity.headroom)}</p>
        </div>
        <div className="rounded-md border border-border bg-card/60 p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Unspent plan</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{formatDisciplineCurrency(capacity.underspend)}</p>
        </div>
        <div className="rounded-md border border-border bg-card/60 p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Fundable</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--success)]">
            {formatDisciplineCurrency(capacity.available)}
          </p>
          <p className="mt-0.5 text-[9px] text-muted">From income received</p>
        </div>
        <div className="rounded-md border border-border bg-card/60 p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Required/mo</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{formatDisciplineCurrency(totalRequiredPerMonth)}</p>
        </div>
        <div className="col-span-2 rounded-md border border-border bg-card/60 p-2.5 lg:col-span-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Gap</p>
          <p
            className={cn(
              'mt-1 text-sm font-semibold tabular-nums',
              gap >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]',
            )}
          >
            {gap >= 0 ? '+' : ''}
            {formatDisciplineCurrency(gap)}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted">{statusMessage(summary)}</p>

      <Link
        href="/dashboard"
        className="inline-block text-xs font-medium text-info underline-offset-2 hover:underline"
      >
        Edit income budget on Dashboard →
      </Link>
    </section>
  );
}
