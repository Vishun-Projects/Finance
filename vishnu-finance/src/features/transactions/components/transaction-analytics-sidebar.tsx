'use client';

import dynamic from 'next/dynamic';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import SpendingCalendar, { type DailySpendEntry } from './spending-calendar';

const TransactionAnalyticsChart = dynamic(
  () => import('./transaction-analytics-chart').then((m) => m.TransactionAnalyticsChart),
  { ssr: false, loading: () => <div className="h-[88px] animate-pulse rounded bg-muted/20" /> },
);

const CHART_BAR_COLORS = [
  'var(--chart-credits)',
  'var(--category-needs)',
  'var(--category-wants)',
  'var(--category-emi)',
  'var(--category-invest)',
  'var(--hint)',
] as const;

interface ImportStatement {
  id: string;
  bankCode: string;
  transactionCount: number;
  importedAt: string;
  closingBalance?: number;
  statementStartDate?: string;
  statementEndDate?: string;
  isCurrentBalanceSource?: boolean;
}

interface TransactionAnalyticsSidebarProps {
  mobilePanel: 'list' | 'calendar' | 'breakdown';
  bindPanelScrollRef: (node: HTMLDivElement | null) => void;
  importStatements: ImportStatement[];
  formatAmount: (value: number) => string;
  dailySpend: DailySpendEntry[];
  isDailySpendLoading: boolean;
  rangeEnd: string;
  startDateParam: string;
  endDateParam: string;
  expense: number;
  daysInRange: number;
  barChartData: Array<{ name: string; value: number }>;
  topCategories: ReadonlyArray<readonly [string, { amount: number; count: number }]>;
  isCategoryBreakdownLoading: boolean;
}

export function TransactionAnalyticsSidebar({
  mobilePanel,
  bindPanelScrollRef,
  importStatements,
  formatAmount,
  dailySpend,
  isDailySpendLoading,
  rangeEnd,
  startDateParam,
  endDateParam,
  expense,
  daysInRange,
  barChartData,
  topCategories,
  isCategoryBreakdownLoading,
}: TransactionAnalyticsSidebarProps) {
  return (
    <aside
      className={cn(
        'card-base flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden',
        mobilePanel === 'list' ? 'hidden lg:flex' : 'flex',
      )}
    >
      {importStatements.length > 0 && (
        <div className="hidden shrink-0 border-b border-border px-3 py-3 md:block">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Statement imports</p>
          <ul className="max-h-28 space-y-2 overflow-y-auto text-[11px]">
            {importStatements.slice(0, 4).map((stmt) => (
              <li key={stmt.id} className="rounded-md border border-border bg-surface/40 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{stmt.bankCode}</span>
                  {stmt.isCurrentBalanceSource && (
                    <Badge variant="outline" className="text-[9px]">
                      Current balance
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 tabular-nums text-muted">
                  {stmt.closingBalance != null ? formatAmount(stmt.closingBalance) : '—'} closing ·{' '}
                  {stmt.transactionCount} txns
                </p>
                <p className="text-[10px] text-muted">
                  {stmt.statementStartDate && stmt.statementEndDate
                    ? `${new Date(stmt.statementStartDate).toLocaleDateString()} – ${new Date(stmt.statementEndDate).toLocaleDateString()}`
                    : 'Period unknown'}{' '}
                  · {new Date(stmt.importedAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden',
          mobilePanel === 'breakdown' && 'hidden',
        )}
      >
        <div
          ref={mobilePanel === 'calendar' ? bindPanelScrollRef : undefined}
          className="scrollbar-none min-h-0 flex-1 overflow-y-auto pb-bottom-bar scroll-pb-bottom-bar"
        >
          <SpendingCalendar
            dailySpend={dailySpend}
            formatAmount={formatAmount}
            rangeEnd={rangeEnd}
            isLoading={isDailySpendLoading}
          />
        </div>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          mobilePanel === 'calendar' && 'hidden lg:flex',
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
            <div>
              <h2 className="text-xs font-medium text-foreground">Breakdown</h2>
              <p className="text-[10px] text-muted">Full period · all transactions</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                const params = new URLSearchParams({ format: 'csv' });
                if (startDateParam) params.set('startDate', startDateParam);
                if (endDateParam) params.set('endDate', endDateParam);
                window.location.href = `/api/export/transactions?${params.toString()}`;
              }}
            >
              <Download className="mr-1 size-3" />
              Export
            </Button>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-border px-3 py-2 text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-hint">Expenses</p>
              <p className="font-medium tabular-nums text-[var(--danger)]">{formatAmount(expense)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-hint">Avg/day</p>
              <p className="font-medium tabular-nums text-foreground">{formatAmount(expense / daysInRange)}</p>
            </div>
          </div>

          {barChartData.length > 0 && (
            <div className="shrink-0 border-b border-border px-3 py-2">
              <TransactionAnalyticsChart
                data={barChartData}
                formatAmount={formatAmount}
                colors={CHART_BAR_COLORS}
              />
            </div>
          )}

          <div
            ref={mobilePanel === 'breakdown' ? bindPanelScrollRef : undefined}
            className="scrollbar-none min-h-0 flex-1 space-y-2 overflow-y-auto p-3 max-lg:scroll-pb-bottom-bar max-lg:pb-bottom-bar"
          >
            {isCategoryBreakdownLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-6 w-full rounded-md" />
                ))}
              </div>
            ) : topCategories.length === 0 ? (
              <p className="text-xs text-muted">No expense categories yet.</p>
            ) : (
              topCategories.map(([name, stats], i) => {
                const totalExp = expense || 1;
                const percent = Math.round((stats.amount / totalExp) * 100);
                return (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-foreground">{name}</span>
                      <span className="tabular-nums text-muted">{formatAmount(stats.amount)}</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-surface">
                      <div className="h-full bg-accent transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
