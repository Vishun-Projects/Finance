import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { cn, formatRupees } from '@/lib/utils';

interface MonthAtGlanceKpisProps {
  income: number;
  expenses: number;
  netFlow: number;
  displayNetFlow?: number;
  hasSettlementAdjustment?: boolean;
  className?: string;
}

const shell =
  'min-w-0 rounded-xl border border-border/70 bg-card/80 p-2.5 sm:p-3';

export function MonthAtGlanceKpis({
  income,
  expenses,
  netFlow,
  displayNetFlow,
  hasSettlementAdjustment = false,
  className,
}: MonthAtGlanceKpisProps) {
  const shownNet = displayNetFlow ?? netFlow;

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3', className)}>
      <div className={shell}>
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Income</p>
        <p className="mt-1 flex items-center gap-1.5 text-base font-semibold tabular-nums text-[var(--success)] sm:text-lg">
          <TrendingUp className="size-3.5 shrink-0" />
          {formatRupees(income)}
        </p>
      </div>
      <div className={shell}>
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">Spent</p>
        <p className="mt-1 flex items-center gap-1.5 text-base font-semibold tabular-nums text-[var(--danger)] sm:text-lg">
          <TrendingDown className="size-3.5 shrink-0" />
          {formatRupees(expenses)}
        </p>
      </div>
      <div className={cn(shell, 'col-span-2 sm:col-span-1')}>
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
          {hasSettlementAdjustment ? 'Net (adjusted)' : 'Net flow'}
        </p>
        <p
          className={cn(
            'mt-1 flex items-center gap-1.5 text-base font-semibold tabular-nums sm:text-lg',
            shownNet >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]',
          )}
        >
          <Wallet className="size-3.5 shrink-0" />
          {shownNet >= 0 ? '+' : ''}
          {formatRupees(shownNet)}
        </p>
      </div>
    </div>
  );
}
