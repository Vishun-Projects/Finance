'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CategoryLegend } from '@/components/ui/category-legend';
import { SegmentSplitBar } from '@/components/ui/segment-split-bar';
import type { CategoryLegendItem, SegmentSplit } from '@/lib/dashboard-insights';
import { cn, formatRupees } from '@/lib/utils';

interface TrendPoint {
  month: string;
  expenses: number;
  income: number;
}

interface PayeePoint {
  name: string;
  amount: number;
  count: number;
}

interface DashboardInsightsStackProps {
  topCategories: CategoryLegendItem[];
  monthlyTrends: TrendPoint[];
  topPayees: PayeePoint[];
  segmentSplit?: SegmentSplit;
  dense?: boolean;
  className?: string;
}

export function DashboardInsightsStack({
  topCategories,
  monthlyTrends,
  topPayees,
  segmentSplit,
  dense = false,
  className,
}: DashboardInsightsStackProps) {
  const showCategories = topCategories.length > 0;
  const showSplit =
    !!segmentSplit && segmentSplit.needs + segmentSplit.wants + segmentSplit.savings > 0;
  const showTrends = monthlyTrends.length > 0;
  const showPayees = topPayees.length > 0;

  if (!showCategories && !showSplit && !showTrends && !showPayees) return null;

  const pad = dense ? 'p-3' : 'p-4';
  const titleClass = dense
    ? 'text-[10px] font-medium uppercase tracking-[0.08em] text-hint'
    : 'text-sm font-medium text-foreground';

  return (
    <section className={cn('card-base overflow-hidden', className)}>
      <div className="divide-y divide-border/60">
        {showCategories ? (
          <div className={pad}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className={titleClass}>Where money went</h2>
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <Link href="/transactions">View txns</Link>
              </Button>
            </div>
            <CategoryLegend items={topCategories} />
          </div>
        ) : null}

        {showSplit && segmentSplit ? (
          <div className={pad}>
            <h2 className={cn('mb-2', titleClass)}>Needs · Wants · Savings</h2>
            <SegmentSplitBar split={segmentSplit} />
          </div>
        ) : null}

        {showTrends ? (
          <div className={pad}>
            <h2 className={cn('mb-2', dense ? 'text-sm font-medium text-foreground' : titleClass)}>
              6-month spend trend
            </h2>
            <ul className="space-y-1.5 text-xs">
              {monthlyTrends.slice(-6).map((t) => (
                <li key={t.month} className="flex justify-between tabular-nums text-muted">
                  <span>{t.month}</span>
                  <span>
                    {formatRupees(t.expenses)} spent · {formatRupees(t.income)} in
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showPayees ? (
          <div className={pad}>
            <h2 className={cn('mb-2', dense ? 'text-sm font-medium text-foreground' : titleClass)}>
              Top payees
            </h2>
            <ul className="space-y-1.5 text-xs">
              {topPayees.slice(0, 5).map((payee) => (
                <li key={payee.name} className="flex justify-between gap-2">
                  <Link
                    href={`/transactions?search=${encodeURIComponent(payee.name)}`}
                    className="truncate text-foreground hover:underline"
                  >
                    {payee.name}
                  </Link>
                  <span className="shrink-0 tabular-nums text-muted">
                    {formatRupees(payee.amount)} · {payee.count}x
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
