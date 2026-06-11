'use client';

import Link from 'next/link';
import { cn, formatRupees } from '@/lib/utils';
import {
  planIncomeSourceLabel,
  receivedSalarySourceLabel,
  type PlanIncomeSource,
} from '@/lib/plan-income';

interface TakeHomeAnchorProps {
  baseIncome: number;
  source: PlanIncomeSource;
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
  showEditLink?: boolean;
  activeSalaryTakeHome?: number | null;
  currentMonthSalaryReceived?: number;
  lastMonthSalaryReceived?: number;
  receivedSalarySource?: 'current_month' | 'last_month' | 'none';
}

function resolveReceivedAmount(
  receivedSalarySource: TakeHomeAnchorProps['receivedSalarySource'],
  currentMonthSalaryReceived?: number,
  lastMonthSalaryReceived?: number,
): number {
  if (receivedSalarySource === 'current_month') return currentMonthSalaryReceived ?? 0;
  if (receivedSalarySource === 'last_month') return lastMonthSalaryReceived ?? 0;
  if ((currentMonthSalaryReceived ?? 0) > 0) return currentMonthSalaryReceived ?? 0;
  return lastMonthSalaryReceived ?? 0;
}

export function TakeHomeAnchor({
  baseIncome,
  source,
  variant = 'default',
  className,
  showEditLink = true,
  activeSalaryTakeHome,
  currentMonthSalaryReceived,
  lastMonthSalaryReceived,
  receivedSalarySource,
}: TakeHomeAnchorProps) {
  const sourceLabel = planIncomeSourceLabel(source);
  const receivedAmount = resolveReceivedAmount(
    receivedSalarySource,
    currentMonthSalaryReceived,
    lastMonthSalaryReceived,
  );
  const receivedLabel =
    receivedSalarySource && receivedSalarySource !== 'none'
      ? receivedSalarySourceLabel(receivedSalarySource)
      : (currentMonthSalaryReceived ?? 0) > 0
        ? 'credited this month'
        : receivedAmount > 0
          ? 'credited last month'
          : null;
  const planScale = activeSalaryTakeHome && activeSalaryTakeHome > 0 ? activeSalaryTakeHome : baseIncome;
  const showReceivedFirst = receivedAmount > 0 && Math.abs(planScale - receivedAmount) > 500;

  const receivedLine =
    receivedAmount > 0 ? (
      <span className="text-muted">
        Salary received{receivedLabel ? ` (${receivedLabel})` : ''}:{' '}
        <strong className="font-medium tabular-nums text-foreground">{formatRupees(receivedAmount)}</strong>
        {lastMonthSalaryReceived != null &&
          lastMonthSalaryReceived > 0 &&
          receivedSalarySource === 'current_month' &&
          lastMonthSalaryReceived !== receivedAmount && (
            <> · Last month {formatRupees(lastMonthSalaryReceived)}</>
          )}
      </span>
    ) : lastMonthSalaryReceived != null && lastMonthSalaryReceived > 0 ? (
      <span className="text-muted">Last month received {formatRupees(lastMonthSalaryReceived)}</span>
    ) : null;

  const planLine =
    showReceivedFirst && planScale > 0 ? (
      <span className="text-muted">
        Plan breakdown scales from {sourceLabel}:{' '}
        <strong className="font-medium tabular-nums text-foreground">{formatRupees(planScale)}/mo</strong>
      </span>
    ) : null;

  if (variant === 'inline') {
    return (
      <p className={cn('text-xs text-muted', className)}>
        {showReceivedFirst && receivedAmount > 0 ? (
          <>
            Received{' '}
            <strong className="font-medium tabular-nums text-foreground">{formatRupees(receivedAmount)}</strong>
            {' · '}
            Plan {formatRupees(planScale)}/mo from {sourceLabel}
          </>
        ) : (
          <>
            Plan scaled to{' '}
            <strong className="font-medium tabular-nums text-foreground">{formatRupees(baseIncome)}</strong>/mo from{' '}
            {sourceLabel}
          </>
        )}
        {receivedLine && !showReceivedFirst && <> · {receivedLine}</>}
        {showEditLink && (
          <>
            {' '}
            ·{' '}
            <Link href="/salary" className="text-primary hover:underline">
              Edit salary
            </Link>
          </>
        )}
      </p>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('min-w-0 space-y-1', className)}>
        {showReceivedFirst ? (
          <>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
              <span>
                Received{' '}
                <strong className="font-medium tabular-nums text-foreground">{formatRupees(receivedAmount)}</strong>
                {receivedLabel ? ` (${receivedLabel})` : ''}
              </span>
              <span className="text-hint">·</span>
              <span>
                Plan {formatRupees(planScale)}/mo · {sourceLabel}
              </span>
              {showEditLink && (
                <Link href="/salary" className="text-primary hover:underline">
                  Update
                </Link>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span>
              Plan{' '}
              <strong className="font-medium tabular-nums text-foreground">{formatRupees(baseIncome)}</strong>/mo
            </span>
            <span className="text-hint">·</span>
            <span>{sourceLabel}</span>
            {showEditLink && (
              <Link href="/salary" className="text-primary hover:underline">
                Update
              </Link>
            )}
          </div>
        )}
        {receivedLine && !showReceivedFirst && <p className="text-[10px]">{receivedLine}</p>}
      </div>
    );
  }

  return (
    <section className={cn('card-base border-border/60 bg-surface/40 p-3 max-lg:p-2.5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">
            {showReceivedFirst ? 'Salary received' : 'Your take-home anchor'}
          </p>
          <p className="text-lg font-semibold tabular-nums text-foreground max-lg:text-base">
            {formatRupees(showReceivedFirst ? receivedAmount : baseIncome)}/mo
          </p>
          {showReceivedFirst ? (
            planLine && <p className="text-xs text-muted">{planLine}</p>
          ) : (
            <p className="text-xs text-muted">Phase plan breakdown scales from {sourceLabel}.</p>
          )}
          {activeSalaryTakeHome != null && activeSalaryTakeHome > 0 && !showReceivedFirst && (
            <p className="text-xs text-muted">Active salary structure: {formatRupees(activeSalaryTakeHome)}/mo</p>
          )}
          {receivedLine && !showReceivedFirst && <p className="text-xs">{receivedLine}</p>}
          {showReceivedFirst && lastMonthSalaryReceived != null && lastMonthSalaryReceived > 0 && (
            <p className="text-xs text-muted">Last month: {formatRupees(lastMonthSalaryReceived)}</p>
          )}
        </div>
        {showEditLink && (
          <Link
            href="/salary"
            className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-surface max-lg:px-2 max-lg:py-0.5"
          >
            Edit salary
          </Link>
        )}
      </div>
    </section>
  );
}
