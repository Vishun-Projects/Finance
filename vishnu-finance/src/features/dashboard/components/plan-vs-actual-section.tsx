'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineItemTransactionsSheet } from '@/features/dashboard/components/line-item-transactions-sheet';
import { CAT_LABEL } from '@/features/money-plan/data/money-plan';
import { categoryColorVar } from '@/design/tokens';
import type { BucketAdherence, LineItemAdherence } from '@/lib/plan-adherence-service';
import { planIncomeSourceLabel } from '@/lib/plan-income';
import { cn, formatRupees } from '@/lib/utils';

function bucketStatusLabel(status: BucketAdherence['status']) {
  if (status === 'on_track') return 'On track';
  if (status === 'warning') return 'Near limit';
  return 'Over budget';
}

function progressClass(status: BucketAdherence['status']) {
  return cn(
    'h-2',
    status === 'over' && '[&>div]:bg-[var(--danger)]',
    status === 'warning' && '[&>div]:bg-[var(--warning)]',
  );
}

function BucketRow({ bucket }: { bucket: BucketAdherence }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-medium text-foreground">{bucket.label}</span>
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
            {bucketStatusLabel(bucket.status)}
          </Badge>
        </div>
        <span className="shrink-0 tabular-nums text-muted">
          {formatRupees(bucket.actual)} / {formatRupees(bucket.planned)}
        </span>
      </div>
      <Progress value={Math.min(100, bucket.percentUsed)} className={progressClass(bucket.status)} />
      <p className="mt-1 text-[10px] text-muted">
        {bucket.status === 'over'
          ? `${formatRupees(bucket.actual - bucket.planned)} over plan`
          : `${formatRupees(bucket.remaining)} remaining`}
      </p>
    </div>
  );
}

function LineItemRow({
  item,
  onClick,
}: {
  item: LineItemAdherence;
  onClick: () => void;
}) {
  const catColor = categoryColorVar[item.cat];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-2.5 text-left transition-colors hover:bg-surface/60 rounded-md px-1 -mx-1"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              background: `color-mix(in srgb, ${catColor} 18%, transparent)`,
              color: catColor,
            }}
          >
            {CAT_LABEL[item.cat]}
          </span>
          <span
            className={cn(
              'truncate text-xs text-foreground',
              item.isBuffer && 'italic text-muted-foreground',
            )}
            title={item.label}
          >
            {item.label}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-right">
          <div>
            <p className="text-xs tabular-nums text-foreground">
              {formatRupees(item.actual)} / {formatRupees(item.planned)}
            </p>
            {item.status !== 'on_track' && (
              <Badge variant="outline" className="mt-0.5 px-1 py-0 text-[9px] font-normal">
                {bucketStatusLabel(item.status)}
              </Badge>
            )}
          </div>
          <ChevronRight className="size-3.5 text-hint" />
        </div>
      </div>
      <Progress value={Math.min(100, item.percentUsed)} className={progressClass(item.status)} />
      <p className="mt-1 text-[10px] text-muted">
        {item.actual === 0
          ? `${formatRupees(item.planned)} planned · tap to inspect`
          : item.status === 'over'
            ? `${formatRupees(item.actual - item.planned)} over plan · tap to see transactions`
            : `${formatRupees(item.remaining)} remaining · tap to see transactions`}
      </p>
    </button>
  );
}

interface PlanVsActualSectionProps {
  buckets: BucketAdherence[];
  lineItems: LineItemAdherence[];
  plannedTotal: number;
  actualTotal: number;
  monthlyIncome: number;
  planBaseIncome: number;
  planIncomeSource: 'salary_structure' | 'transaction_salary' | 'default';
  incomeBreakdown?: {
    salary: number;
    family: number;
    other: number;
    total: number;
  };
  maxHeight?: number;
}

export function PlanVsActualSection({
  buckets,
  lineItems,
  plannedTotal,
  actualTotal,
  monthlyIncome,
  planBaseIncome,
  planIncomeSource,
  incomeBreakdown,
  maxHeight,
}: PlanVsActualSectionProps) {
  const router = useRouter();
  const totalDelta = actualTotal - plannedTotal;
  const [selectedLineItem, setSelectedLineItem] = useState<LineItemAdherence | null>(null);

  return (
    <>
      <section
        className="card-base flex min-h-0 flex-col overflow-hidden p-4"
        style={maxHeight ? { maxHeight: `${maxHeight}px` } : undefined}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-foreground">Monthly plan vs actual</h2>
            <p className="text-[10px] text-muted">
              Budget scaled to {formatRupees(planBaseIncome)} take-home ({planIncomeSourceLabel(planIncomeSource)})
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href="/phase-plan">
              View plan
              <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="overview" className="flex min-h-0 w-full flex-1 flex-col">
          <TabsList className="mb-4 h-8 w-full shrink-0 justify-start bg-surface">
            <TabsTrigger value="overview" className="h-7 px-3 text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="h-7 px-3 text-xs">
              Full breakdown
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {buckets.map((bucket) => (
                <BucketRow key={bucket.key} bucket={bucket} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="divide-y divide-border">
                {lineItems.map((item) => (
                  <LineItemRow
                    key={item.label}
                    item={item}
                    onClick={() => setSelectedLineItem(item)}
                  />
                ))}
              </div>
            </div>
            <div className="mt-3 flex shrink-0 items-center justify-between border-t-2 border-foreground pt-3">
              <span className="text-xs font-medium text-foreground">Total</span>
              <span
                className={cn(
                  'text-xs font-medium tabular-nums',
                  totalDelta > 0 ? 'text-[var(--danger)]' : totalDelta < 0 ? 'text-[var(--success)]' : 'text-foreground',
                )}
              >
                {formatRupees(actualTotal)} / {formatRupees(plannedTotal)}
                {totalDelta === 0
                  ? ' ✓'
                  : ` (${totalDelta > 0 ? 'over' : 'under'} by ${formatRupees(Math.abs(totalDelta))})`}
              </span>
            </div>
            {monthlyIncome > plannedTotal && (
              <p className="mt-2 shrink-0 text-[10px] text-muted">
                Plan allocates {formatRupees(plannedTotal)} of {formatRupees(monthlyIncome)} received this month
                {incomeBreakdown && incomeBreakdown.family > 0
                  ? ` (salary ${formatRupees(incomeBreakdown.salary)} + family ${formatRupees(incomeBreakdown.family)}`
                    + (incomeBreakdown.other > 0 ? ` + other ${formatRupees(incomeBreakdown.other)}` : '')
                    + ')'
                  : ''}
                {' · '}
                {formatRupees(monthlyIncome - plannedTotal)} unallocated headroom
              </p>
            )}
            {monthlyIncome <= plannedTotal && planBaseIncome > 0 && (
              <p className="mt-2 shrink-0 text-[10px] text-muted">
                Plan targets {formatRupees(plannedTotal)} based on {formatRupees(planBaseIncome)} take-home.
                {monthlyIncome < plannedTotal
                  ? ` Received ${formatRupees(monthlyIncome)} so far this month.`
                  : ''}
              </p>
            )}
            <p className="mt-2 shrink-0 text-[10px] text-muted">
              Tap any row to see the transactions behind it. Lend money to a friend and got it back?
              Link both transactions so only the net counts.
            </p>
          </TabsContent>
        </Tabs>
      </section>

      <LineItemTransactionsSheet
        open={selectedLineItem !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLineItem(null);
        }}
        lineItemLabel={selectedLineItem?.label ?? null}
        planned={selectedLineItem?.planned ?? 0}
        actual={selectedLineItem?.actual ?? 0}
        onUpdated={() => router.refresh()}
      />
    </>
  );
}
