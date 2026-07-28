'use client';

import { format } from 'date-fns';
import { Landmark, AlertTriangle } from 'lucide-react';
import type { CurrentAccountBalance } from '@/lib/account-balance-service';
import { cn, formatRupees } from '@/lib/utils';

interface AccountBalanceChipProps {
  balance: CurrentAccountBalance | null | undefined;
  variant?: 'default' | 'compact' | 'inline' | 'kpi';
  className?: string;
}

export function AccountBalanceChip({
  balance,
  variant = 'default',
  className,
}: AccountBalanceChipProps) {
  if (!balance?.amount && balance?.amount !== 0) {
    if (variant === 'kpi') {
      return (
        <div className={cn('min-w-0 rounded-xl border border-border/70 bg-card/80 p-2.5 sm:p-3', className)}>
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Bank balance</p>
          <p className="mt-1 text-sm text-muted">Upload a statement to see balance</p>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'rounded-md border border-dashed border-border bg-surface/40 px-3 py-2 text-xs text-muted',
          className,
        )}
      >
        Upload a bank statement to see your balance
      </div>
    );
  }

  const asOfLabel = balance.asOfDate
    ? format(new Date(balance.asOfDate), 'd MMM yyyy')
    : null;
  const uploadedLabel = balance.importedAt
    ? format(new Date(balance.importedAt), 'd MMM yyyy')
    : null;
  const hasWarning = Boolean(balance.warning) || balance.source === 'fallback_txn';

  if (variant === 'inline') {
    return (
      <span className={cn('text-xs text-muted', className)}>
        Bank {formatRupees(balance.amount)}
        {asOfLabel && <> · as of {asOfLabel}</>}
      </span>
    );
  }

  if (variant === 'kpi') {
    return (
      <div
        className={cn(
          'min-w-0 rounded-xl border border-border/70 bg-card/80 p-2.5 sm:p-3',
          hasWarning && 'border-[var(--warning)]/40',
          className,
        )}
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Bank balance</p>
        <p className="mt-1 flex items-center gap-1.5 text-base font-semibold tabular-nums text-foreground sm:text-lg">
          <Landmark className="size-3.5 shrink-0 text-info" />
          {formatRupees(balance.amount)}
        </p>
        <p className="mt-0.5 text-[10px] text-muted">
          {asOfLabel && <>As of {asOfLabel}</>}
          {uploadedLabel && <> · PDF {uploadedLabel}</>}
        </p>
        {balance.warning && (
          <p className="mt-1 flex items-start gap-1 text-[10px] text-[var(--warning)]">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            {balance.warning}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-1.5',
          hasWarning ? 'border-[var(--warning)]/40 bg-[var(--warning)]/5' : 'border-border bg-surface/40',
          className,
        )}
      >
        <Landmark className="size-3.5 shrink-0 text-info" />
        <div className="min-w-0 truncate">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Bank balance</p>
          <p className="truncate text-sm font-semibold tabular-nums text-foreground">
            {formatRupees(balance.amount)}
            {asOfLabel && <span className="ml-1 text-[10px] font-normal text-muted">· {asOfLabel}</span>}
          </p>
        </div>
        {hasWarning && <AlertTriangle className="size-3 shrink-0 text-[var(--warning)]" />}
      </div>
    );
  }

  return (
    <section
      className={cn(
        'card-base flex min-w-0 items-start gap-3 p-3',
        hasWarning ? 'border-[var(--warning)]/30' : '',
        className,
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface">
        <Landmark className="size-4 text-info" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Bank balance</p>
        <p className="truncate text-lg font-semibold tabular-nums text-foreground">
          {formatRupees(balance.amount)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted">
          {asOfLabel && <>As of {asOfLabel}</>}
          {uploadedLabel && <> · from PDF uploaded {uploadedLabel}</>}
        </p>
        {balance.warning && (
          <p className="mt-1 flex items-start gap-1 text-[10px] text-[var(--warning)]">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            {balance.warning}
          </p>
        )}
      </div>
    </section>
  );
}
