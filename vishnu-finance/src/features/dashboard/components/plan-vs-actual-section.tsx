'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineItemTransactionsSheet } from '@/features/dashboard/components/line-item-transactions-sheet';
import { BudgetSetupSheet } from '@/features/dashboard/components/budget-setup-sheet';
import { TakeHomeAnchor } from '@/components/finance/take-home-anchor';
import { CAT_LABEL } from '@/features/money-plan/data/money-plan';
import { categoryColorVar } from '@/design/tokens';
import type { BucketAdherence, LineItemAdherence } from '@/lib/plan-adherence-service';
import { planIncomeSourceLabel, receivedSalarySourceLabel, type PlanIncomeContext, type PlanIncomeSource } from '@/lib/plan-income';
import { cn, formatRupees } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/use-breakpoint';

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
    <div className="max-lg:space-y-1">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs max-lg:mb-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-medium text-foreground">
            {bucket.label}
            {bucket.percentage != null ? (
              <span className="ml-1 font-normal text-muted">({bucket.percentage}%)</span>
            ) : null}
          </span>
          <Badge variant="outline" className="max-lg:hidden px-1.5 py-0 text-[10px] font-normal md:inline-flex">
            {bucketStatusLabel(bucket.status)}
          </Badge>
        </div>
        <span className="shrink-0 tabular-nums text-muted">
          {formatRupees(bucket.actual)} / {formatRupees(bucket.planned)}
        </span>
      </div>
      <Progress value={Math.min(100, bucket.percentUsed)} className={progressClass(bucket.status)} />
      <p className="mt-1 hidden text-[10px] text-muted md:block">
        {bucket.status === 'over'
          ? `${formatRupees(bucket.actual - bucket.planned)} over plan`
          : `${formatRupees(bucket.remaining)} left in plan`}
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
              {item.planned > 0
                ? `${formatRupees(item.actual)} / ${formatRupees(item.planned)}`
                : formatRupees(item.actual)}
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
      <p className="mt-1 hidden text-[10px] text-muted md:block">
        {item.actual === 0
          ? `${formatRupees(item.planned)} planned · tap to inspect`
          : item.status === 'over'
            ? `${formatRupees(item.actual - item.planned)} over plan · tap to see transactions`
            : `${formatRupees(item.remaining)} left in plan · tap to see transactions`}
      </p>
    </button>
  );
}

interface PlanVsActualSectionProps {
  buckets: BucketAdherence[];
  lineItems: LineItemAdherence[];
  plannedTotal: number;
  actualTotal: number;
  salaryReceived: number;
  planBaseIncome: number;
  planIncomeSource: PlanIncomeSource;
  planIncomeContext?: PlanIncomeContext;
  incomeBreakdown?: {
    salary: number;
    family: number;
    other: number;
    total: number;
  };
  maxHeight?: number;
  className?: string;
  budgetPlanName?: string;
  defaultTab?: 'overview' | 'breakdown';
}

export function PlanVsActualSection({
  buckets,
  lineItems,
  plannedTotal,
  actualTotal,
  salaryReceived,
  planBaseIncome,
  planIncomeSource,
  planIncomeContext,
  incomeBreakdown,
  maxHeight,
  className,
  budgetPlanName,
  defaultTab,
}: PlanVsActualSectionProps) {
  const router = useRouter();
  const isLgUp = useBreakpoint('lg');
  const totalDelta = actualTotal - plannedTotal;
  const [selectedLineItem, setSelectedLineItem] = useState<LineItemAdherence | null>(null);
  const [showAllBreakdown, setShowAllBreakdown] = useState(false);
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);
  const resolvedDefaultTab = defaultTab ?? (isLgUp ? 'breakdown' : 'overview');
  const visibleLineItems = showAllBreakdown || isLgUp ? lineItems : lineItems.slice(0, 5);

  return (
    <div className={cn(className)}>
      <TakeHomeAnchor
        baseIncome={planBaseIncome}
        source={planIncomeSource}
        variant="compact"
        className="mb-3 shrink-0 max-lg:mb-2"
        activeSalaryTakeHome={planIncomeContext?.activeSalaryTakeHome}
        currentMonthSalaryReceived={planIncomeContext?.currentMonthSalaryReceived}
        lastMonthSalaryReceived={planIncomeContext?.lastMonthSalaryReceived}
        receivedSalarySource={planIncomeContext?.receivedSalarySource}
      />
      <section className="card-base flex flex-col p-4 max-lg:p-3">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-2 max-lg:mb-2">
          <div>
            <h2 className="text-sm font-medium text-foreground">Monthly budget vs actual</h2>
            <p className="text-[10px] text-muted">
              {budgetPlanName ?? 'Your budget'} · scaled to {formatRupees(planBaseIncome)} take-home (
              {planIncomeSourceLabel(planIncomeSource)})
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 text-xs"
            onClick={() => setBudgetSheetOpen(true)}
          >
            Edit budget
          </Button>
        </div>

        <Tabs defaultValue={resolvedDefaultTab} className="w-full">
          <TabsList className="mb-4 h-8 w-full shrink-0 justify-start border-0 bg-surface max-lg:mb-2 max-lg:h-7">
            <TabsTrigger value="overview" className="h-7 px-3 text-xs shadow-none data-[state=active]:shadow-none">
              Overview
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="h-7 px-3 text-xs shadow-none data-[state=active]:shadow-none">
              By category
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 data-[state=inactive]:hidden">
            <div className="space-y-4 max-lg:space-y-2">
              {buckets.map((bucket) => (
                <BucketRow key={bucket.key} bucket={bucket} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="mt-0 data-[state=inactive]:hidden">
            <div>
              <div className="divide-y divide-border">
                {visibleLineItems.map((item) => (
                  <LineItemRow
                    key={item.label}
                    item={item}
                    onClick={() => setSelectedLineItem(item)}
                  />
                ))}
              </div>
              {lineItems.length > 5 && !isLgUp && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 w-full text-xs"
                  onClick={() => setShowAllBreakdown((v) => !v)}
                >
                  {showAllBreakdown ? 'Show less' : `Show all ${lineItems.length} items`}
                </Button>
              )}
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
            {salaryReceived > plannedTotal && (
              <p className="mt-2 shrink-0 text-[10px] text-muted">
                Plan allocates {formatRupees(plannedTotal)} of {formatRupees(salaryReceived)} salary credited
                {planIncomeContext?.receivedSalarySource && planIncomeContext.receivedSalarySource !== 'none'
                  ? ` (${receivedSalarySourceLabel(planIncomeContext.receivedSalarySource)})`
                  : ''}
                {' · '}
                {formatRupees(salaryReceived - plannedTotal)} unallocated headroom
              </p>
            )}
            {salaryReceived <= plannedTotal && planBaseIncome > 0 && (
              <p className="mt-2 shrink-0 text-[10px] text-muted">
                Plan targets {formatRupees(plannedTotal)} based on {formatRupees(planBaseIncome)} take-home.
                {salaryReceived < plannedTotal && salaryReceived > 0
                  ? ` Salary credited ${formatRupees(salaryReceived)}${
                      planIncomeContext?.receivedSalarySource &&
                      planIncomeContext.receivedSalarySource !== 'none'
                        ? ` (${receivedSalarySourceLabel(planIncomeContext.receivedSalarySource)})`
                        : ''
                    }.`
                  : salaryReceived === 0 && planIncomeContext?.lastMonthSalaryReceived
                    ? ` No salary credited this month yet · last month ${formatRupees(planIncomeContext.lastMonthSalaryReceived)}.`
                    : salaryReceived === 0
                      ? ' No salary credited yet this month.'
                      : ''}
                {incomeBreakdown && incomeBreakdown.total > salaryReceived && (
                  <> Total income {formatRupees(incomeBreakdown.total)} incl. non-salary credits.</>
                )}
              </p>
            )}
            <p className="mt-2 shrink-0 text-[10px] text-muted">
              Investments and insurance lines are part of your phase plan — Goals on Plans are tracked separately.
            </p>
            <p className="mt-1 shrink-0 text-[10px] text-muted max-lg:hidden">
              Category spend this month — tap a row to see transactions.
            </p>
          </TabsContent>
        </Tabs>
      </section>

      <BudgetSetupSheet
        open={budgetSheetOpen}
        onOpenChange={setBudgetSheetOpen}
        onSaved={() => router.refresh()}
      />

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
    </div>
  );
}
