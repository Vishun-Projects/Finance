'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ReceiptText,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Progress } from '@/components/ui/progress';
import { patterns } from '@/design/patterns';
import type { DashboardBootstrap } from '@/features/dashboard/types';
import { PlanVsActualSection } from '@/features/dashboard/components/plan-vs-actual-section';
import type { GoalAdherence } from '@/lib/plan-adherence-service';
import { cn, formatRupees } from '@/lib/utils';
import { getTransactionDisplayName } from '@/lib/transaction-utils';
import { MobileHeroMetric } from '@/components/ui/mobile-kpi-strip';
import { NavPill, NavPillGroup } from '@/components/ui/nav-pill';
import { useBreakpoint } from '@/hooks/use-breakpoint';

interface DashboardPageProps {
  data: DashboardBootstrap;
}

function goalStatusLabel(status: GoalAdherence['status']) {
  if (status === 'completed') return 'Completed';
  if (status === 'on_track') return 'On track';
  return 'Behind';
}

function goalStatusVariant(status: GoalAdherence['status']): 'success' | 'warning' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'on_track') return 'success';
  return 'warning';
}

export default function DashboardPage({ data }: DashboardPageProps) {
  const { stats, adherence } = data;
  const { currentMonthStats, incomeBreakdown } = stats;
  const income = currentMonthStats.income;
  const expenses = currentMonthStats.expenses;
  const netFlow = currentMonthStats.netFlow;
  const monthlyIncome = incomeBreakdown?.total ?? currentMonthStats.income;
  const planBaseIncome = adherence.planBaseIncome;

  const combinedPlanScore =
    adherence.activeGoals > 0
      ? Math.round((adherence.overallScore + (adherence.goalsOnTrack / adherence.activeGoals) * 100) / 2)
      : adherence.overallScore;

  const overBudgetBuckets = adherence.buckets.filter((bucket) => bucket.status === 'over');
  const overdueDeadlines = (stats.deadlinesInfo.items || []).filter((item) => {
    const due = new Date(item.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  });

  const alerts: string[] = [
    ...overBudgetBuckets.map((bucket) => `${bucket.label} is over plan by ${formatRupees(bucket.actual - bucket.planned)}`),
    ...overdueDeadlines.slice(0, 2).map((item) => `Overdue: ${item.title}`),
    ...adherence.goals
      .filter((goal) => goal.status === 'behind')
      .slice(0, 2)
      .map((goal) => `Goal behind pace: ${goal.name}`),
  ];

  const isMdUp = useBreakpoint('md');
  const mobileAlerts = alerts.slice(0, isMdUp ? 4 : 2);
  const mobileGoals = adherence.goals.slice(0, isMdUp ? 5 : 3);
  const recentTransactions = stats.recentTransactions.slice(0, isMdUp ? 8 : 4);
  const recentActivityRef = useRef<HTMLElement>(null);
  const [recentActivityHeight, setRecentActivityHeight] = useState<number>();
  const [mobileView, setMobileView] = useState<'summary' | 'plan' | 'activity'>('summary');

  useEffect(() => {
    const element = recentActivityRef.current;
    if (!element) return;

    const updateHeight = () => {
      setRecentActivityHeight(element.offsetHeight);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [adherence.goals.length, recentTransactions.length]);

  return (
    <div className={cn(patterns.pageFluid, 'flex flex-col gap-5 max-md:gap-3 pb-8')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="max-md:hidden text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Dashboard</p>
          <h1 className="text-xl font-semibold text-foreground max-md:text-lg">{adherence.monthLabel}</h1>
          <p className="max-md:hidden text-xs text-muted">Live transactions vs your phase plan and goals</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-md:hidden">
          <Button variant="outline" size="sm" asChild>
            <Link href="/phase-plan">Phase plan</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/transactions">
              <ReceiptText className="mr-1.5 size-3.5" />
              Transactions
            </Link>
          </Button>
        </div>
      </div>

      <MobileHeroMetric
        label="Net flow"
        value={`${netFlow >= 0 ? '+' : ''}${formatRupees(netFlow)}`}
        tone={netFlow >= 0 ? 'success' : 'danger'}
        subtitle={
          <span>
            Income {formatRupees(income)} · Spent {formatRupees(expenses)}
          </span>
        }
        footer={
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted">
              <span>Plan adherence {combinedPlanScore}%</span>
              <span>
                {adherence.activeGoals > 0
                  ? `${adherence.goalsOnTrack}/${adherence.activeGoals} goals on track`
                  : 'No goals set'}
              </span>
            </div>
            <Progress value={combinedPlanScore} className="h-1.5" />
          </div>
        }
      />

      <div className="hidden grid-cols-2 gap-3 sm:grid-cols-2 md:grid lg:grid-cols-4">
        <div className="card-base card-compact p-4 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Income</p>
          <p className="mt-2 flex items-center gap-1.5 text-lg font-semibold tabular-nums text-[var(--success)] sm:text-xl">
            <TrendingUp className="size-4" />
            {formatRupees(income)}
          </p>
          {incomeBreakdown && incomeBreakdown.total > 0 && (
            <p className="mt-1 hidden text-[10px] text-muted md:block">
              Salary {formatRupees(incomeBreakdown.salary)}
              {incomeBreakdown.family > 0 ? ` · Family ${formatRupees(incomeBreakdown.family)}` : ''}
              {incomeBreakdown.other > 0 ? ` · Other ${formatRupees(incomeBreakdown.other)}` : ''}
            </p>
          )}
        </div>
        <div className="card-base p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Spent</p>
          <p className="mt-2 flex items-center gap-1.5 text-lg font-semibold tabular-nums text-[var(--danger)] sm:text-xl">
            <TrendingDown className="size-4" />
            {formatRupees(expenses)}
          </p>
        </div>
        <div className="card-base p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Net flow</p>
          <p
            className={cn(
              'mt-2 flex items-center gap-1.5 text-lg font-semibold tabular-nums sm:text-xl',
              netFlow >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]',
            )}
          >
            <Wallet className="size-4" />
            {netFlow >= 0 ? '+' : ''}
            {formatRupees(netFlow)}
          </p>
        </div>
        <div className="card-base p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Plan adherence</p>
          <p className="mt-2 text-lg font-semibold tabular-nums text-foreground sm:text-xl">{combinedPlanScore}%</p>
          <Progress value={combinedPlanScore} className="mt-2 h-1.5" />
          <p className="mt-1 hidden text-[10px] text-muted md:block">
            Budget {adherence.overallScore}% · Goals{' '}
            {adherence.activeGoals > 0
              ? `${adherence.goalsOnTrack}/${adherence.activeGoals} on track`
              : 'none set'}
          </p>
        </div>
      </div>

      {mobileAlerts.length > 0 && (
        <div className={cn(
          'card-base border-[var(--warning)]/30 bg-[var(--warning)]/5 p-4 max-md:p-3',
          mobileView !== 'summary' && 'max-md:hidden'
        )}>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertCircle className="size-4 text-[var(--warning)]" />
            Needs attention
          </div>
          <ul className="space-y-1 text-xs text-muted">
            {mobileAlerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      <NavPillGroup className="w-full justify-start md:hidden">
        {(
          [
            ['summary', 'Summary'],
            ['plan', 'Plan'],
            ['activity', 'Activity'],
          ] as const
        ).map(([view, label]) => (
          <NavPill key={view} label={label} active={mobileView === view} onClick={() => setMobileView(view)} />
        ))}
      </NavPillGroup>

      <div className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:items-start">
        <div className={cn(mobileView !== 'plan' && 'max-md:hidden')}>
        <PlanVsActualSection
          buckets={adherence.buckets}
          lineItems={adherence.lineItems}
          plannedTotal={adherence.plannedTotal}
          actualTotal={adherence.actualTotal}
          maxHeight={isMdUp ? recentActivityHeight : undefined}
          monthlyIncome={monthlyIncome}
          planBaseIncome={planBaseIncome}
          planIncomeSource={adherence.planIncomeSource}
          incomeBreakdown={incomeBreakdown}
        />
        </div>

        <div className="flex flex-col gap-4">
          <section className={cn('card-base shrink-0 p-4 max-md:p-3', mobileView !== 'activity' && 'max-md:hidden')}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium text-foreground">Goals tracker</h2>
                <p className="text-[10px] text-muted">Progress vs target pace</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <Link href="/plans">
                  All plans
                  <ArrowRight className="ml-1 size-3" />
                </Link>
              </Button>
            </div>
            {adherence.goals.length === 0 ? (
              <p className="text-xs text-muted">No active goals yet. Add goals on the Plans page.</p>
            ) : (
              <div className="space-y-3">
                {mobileGoals.map((goal) => (
                  <div key={goal.id} className="rounded-md border border-border bg-surface/40 p-3">
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{goal.name}</p>
                        <p className="text-[10px] text-muted">
                          {formatRupees(goal.currentAmount)} of {formatRupees(goal.targetAmount)}
                        </p>
                      </div>
                      <Chip variant={goalStatusVariant(goal.status)} className="shrink-0 text-[10px]">
                        {goalStatusLabel(goal.status)}
                      </Chip>
                    </div>
                    <Progress value={goal.progressPercent} className="h-1.5" />
                    {goal.targetDate ? (
                      <p className="mt-1 hidden text-[10px] text-muted md:block">Target {format(new Date(goal.targetDate), 'd MMM yyyy')}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            ref={recentActivityRef}
            className={cn('card-base p-4 max-md:p-3', mobileView !== 'activity' && 'max-md:hidden md:block')}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium text-foreground">Recent activity</h2>
                <p className="text-[10px] text-muted">Latest transactions this month</p>
              </div>
              <Target className="size-4 text-hint" />
            </div>
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-muted">No transactions this month.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentTransactions.map((tx) => {
                  const isIncome = tx.amount > 0;
                  const displayName =
                    getTransactionDisplayName({
                      description: tx.description ?? undefined,
                      store: tx.store,
                      personName: tx.personName,
                    }) || tx.title;
                  return (
                    <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                          <span>{format(new Date(tx.date), 'd MMM')}</span>
                          <Chip variant="neutral" className="px-1 py-0 text-[10px]">
                            {tx.category}
                          </Chip>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 text-xs font-medium tabular-nums',
                          isIncome ? 'text-[var(--success)]' : 'text-[var(--danger)]',
                        )}
                      >
                        {isIncome ? '+' : ''}
                        {formatRupees(Math.abs(tx.amount))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
              <Link href="/transactions">View all transactions</Link>
            </Button>
          </section>
        </div>
      </div>

      {stats.salaryInfo && (
        <div className="card-base flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2 text-sm text-foreground sm:items-center">
            <CheckCircle2 className="size-4 text-[var(--success)]" />
            <span>
              Salary: {stats.salaryInfo.jobTitle} · {stats.salaryInfo.company} · take-home{' '}
              {formatRupees(stats.salaryInfo.takeHome)}/mo
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href="/salary">Manage salary</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
