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
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      <div className="card-base card-compact p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Income</p>
        <p className="mt-2 flex items-center gap-1.5 text-lg font-semibold tabular-nums text-[var(--success)] sm:text-xl">
          <TrendingUp className="size-4" />
          {formatRupees(income)}
        </p>
      </div>
      <div className="card-base p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Spent</p>
        <p className="mt-2 flex items-center gap-1.5 text-lg font-semibold tabular-nums text-[var(--danger)] sm:text-xl">
          <TrendingDown className="size-4" />
          {formatRupees(expenses)}
        </p>
      </div>
      <div className="card-base col-span-2 p-4 sm:col-span-1 lg:col-span-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">
          {hasSettlementAdjustment ? 'Net flow (adjusted)' : 'Net flow'}
        </p>
        <p
          className={cn(
            'mt-2 flex items-center gap-1.5 text-lg font-semibold tabular-nums sm:text-xl',
            shownNet >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
          )}
        >
          <Wallet className="size-4" />
          {shownNet >= 0 ? '+' : ''}
          {formatRupees(shownNet)}
        </p>
      </div>
    </div>
  );
}
