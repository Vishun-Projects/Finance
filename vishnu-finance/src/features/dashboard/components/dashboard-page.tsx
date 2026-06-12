'use client';

import Link from 'next/link';
import { NavLink } from '@/components/layout/nav-link';
import { useRouter } from 'next/navigation';
import { format, differenceInCalendarDays, startOfDay } from 'date-fns';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Moon,
  ReceiptText,
  Settings,
  Sun,
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
import { CompactListRow } from '@/components/ui/compact-list-row';
import { InsightBanner } from '@/components/ui/insight-banner';
import { SegmentSplitBar } from '@/components/ui/segment-split-bar';
import { CategoryLegend } from '@/components/ui/category-legend';
import {
  DashboardSegmentedNav,
  type DashboardMobileView,
} from '@/features/dashboard/components/dashboard-segmented-nav';
import { DashboardSearchBar } from '@/features/dashboard/components/dashboard-search-bar';
import { DashboardRecentActivity } from '@/features/dashboard/components/dashboard-recent-activity';
import { DashboardQuickActionGrid } from '@/features/dashboard/components/dashboard-quick-action-grid';
import { DashboardExploreGrid } from '@/features/dashboard/components/dashboard-explore-grid';
import { PageMandate } from '@/components/layout/page-mandate';
import { TabPanelTransition } from '@/components/motion/tab-panel';
import { useTheme } from '@/contexts/ThemeContext';
import {
  buildContextBanner,
  computeNeedsWantsSavingsSplit,
  computeSpendingContext,
  getOverBudgetBuckets,
  getTopCategoriesWithPct,
} from '@/lib/dashboard-insights';
import {
  formatDisciplineCurrency,
  computeSafeToSpend,
  type DisciplineSummary,
} from '@/lib/plans-discipline';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useMobileRefreshRegister } from '@/contexts/MobileRefreshContext';
import { useRouteBootstrap, clearAllAppRouteBootstraps } from '@/hooks/use-route-bootstrap';
import { isDashboardBootstrapEmpty } from '@/lib/bootstrap-utils';

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

function deadlineDueLabel(dueDate: string) {
  const daysLeft = differenceInCalendarDays(startOfDay(new Date(dueDate)), startOfDay(new Date()));
  if (daysLeft === 0) return 'Due today';
  if (daysLeft === 1) return 'Due tomorrow';
  return `Due in ${daysLeft} days`;
}

export default function DashboardPage({ data: serverData }: DashboardPageProps) {
  const router = useRouter();
  const data = useRouteBootstrap('/dashboard', serverData, { isEmpty: isDashboardBootstrapEmpty });
  const { stats, adherence, disciplineSummary: initialDisciplineSummary, planIncomeContext } = data;
  const { currentMonthStats, incomeBreakdown } = stats;
  const income = currentMonthStats.income;
  const expenses = currentMonthStats.expenses;
  const netFlow = currentMonthStats.netFlow;
  const adjustedNetFlow = currentMonthStats.adjustedNetFlow;
  const hasSettlementAdjustment = adjustedNetFlow !== netFlow;
  const displayNetFlow = hasSettlementAdjustment ? adjustedNetFlow : netFlow;
  const salaryReceived = planIncomeContext.receivedSalaryAnchor;
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

  const upcomingSoonDeadlines = useMemo(() => {
    const today = startOfDay(new Date());
    const threeDaysOut = new Date(today);
    threeDaysOut.setDate(threeDaysOut.getDate() + 3);

    return (stats.deadlinesInfo.items || [])
      .filter((item) => {
        const due = startOfDay(new Date(item.dueDate));
        return due >= today && due <= threeDaysOut;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [stats.deadlinesInfo.items]);

  const spendingContext = useMemo(
    () => computeSpendingContext(currentMonthStats, adherence.plannedTotal),
    [currentMonthStats, adherence.plannedTotal],
  );
  const segmentSplit = useMemo(() => computeNeedsWantsSavingsSplit(adherence.buckets), [adherence.buckets]);
  const topCategories = useMemo(
    () => getTopCategoriesWithPct(stats.categoryBreakdown ?? [], 5),
    [stats.categoryBreakdown],
  );
  const summaryBudgetBuckets = useMemo(() => getOverBudgetBuckets(adherence.buckets, 4), [adherence.buckets]);
  const contextBanner = useMemo(
    () => buildContextBanner(currentMonthStats, incomeBreakdown, stats.salaryInfo, netFlow),
    [currentMonthStats, incomeBreakdown, stats.salaryInfo, netFlow],
  );

  const alerts: string[] = [
    ...overBudgetBuckets.map((bucket) => `${bucket.label} is over plan by ${formatRupees(bucket.actual - bucket.planned)}`),
    ...overdueDeadlines.slice(0, 2).map((item) => `Overdue: ${item.title}`),
    ...adherence.goals
      .filter((goal) => goal.status === 'behind')
      .slice(0, 2)
      .map((goal) => `Goal behind pace: ${goal.name}`),
  ];

  const isMdUp = useBreakpoint('lg');
  const mobileAlerts = alerts.slice(0, isMdUp ? 4 : 2);
  const mobileGoals = adherence.goals.slice(0, isMdUp ? 5 : 2);
  const overviewRecentTransactions = stats.recentTransactions.slice(0, 3);
  const recentTransactions = stats.recentTransactions.slice(0, isMdUp ? 8 : 4);
  const [mobileView, setMobileView] = useState<DashboardMobileView>('overview');
  const { setTheme, isLoading: themeLoading, isDark } = useTheme();
  const isDarkMode = !themeLoading && isDark;
  const [disciplineSummary, setDisciplineSummary] = useState<DisciplineSummary | null>(
    initialDisciplineSummary ?? null,
  );

  useEffect(() => {
    setDisciplineSummary(initialDisciplineSummary ?? null);
  }, [initialDisciplineSummary]);

  useMobileRefreshRegister(
    useCallback(async () => {
      clearAllAppRouteBootstraps();
      router.refresh();
    }, [router]),
    '/dashboard',
  );

  const safeToSpend = useMemo(() => {
    if (!disciplineSummary) return null;
    const upcoming = disciplineSummary.deadlines
      .filter((d) => d.isDueThisMonth || d.isOverdue)
      .reduce((sum, d) => sum + d.requiredThisMonth, 0);
    return computeSafeToSpend(disciplineSummary, upcoming);
  }, [disciplineSummary]);

  return (
    <div className={cn(patterns.pageFluid, 'flex flex-col gap-5 pb-4 lg:pb-8')}>
      {/* Dashboard header — replaces global top bar on this route */}
      <div className="safe-top shrink-0 -mx-4 flex items-start justify-between gap-2 px-4 pt-2">
        <PageMandate
          className="min-w-0 flex-1"
          title={adherence.monthLabel}
          mandate="This month at a glance — pulse, search, and shortcuts."
          metrics={[
            {
              label: 'Net flow',
              value: `${displayNetFlow >= 0 ? '+' : ''}${formatRupees(displayNetFlow)}`,
              tone: displayNetFlow >= 0 ? 'success' : 'danger',
            },
            {
              label: 'Plan adherence',
              value: `${combinedPlanScore}%`,
            },
            ...(safeToSpend
              ? [{
                  label: 'Safe to spend',
                  value: formatDisciplineCurrency(safeToSpend.safeToSpend),
                }]
              : upcomingSoonDeadlines.length > 0
                ? [{
                    label: 'Due soon',
                    value: String(upcomingSoonDeadlines.length),
                    href: '/plans?tab=deadlines',
                  }]
                : mobileAlerts.length > 0
                  ? [{
                      label: 'Alert',
                      value: mobileAlerts[0]!.length > 24 ? `${mobileAlerts[0]!.slice(0, 24)}…` : mobileAlerts[0]!,
                      tone: 'warning' as const,
                    }]
                  : []),
          ]}
        />
        <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5 lg:hidden">
          <button
            type="button"
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className="btn-touch flex size-9 items-center justify-center rounded-full border border-border/60 text-muted hover:bg-surface hover:text-foreground"
            aria-label="Toggle theme"
            suppressHydrationWarning
          >
            {isDarkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>
          <NavLink
            href="/settings"
            linkClassName="flex shrink-0"
            className="btn-touch flex size-9 items-center justify-center rounded-full border border-border/60 text-muted hover:bg-surface hover:text-foreground"
            aria-label="Settings"
          >
            <Settings className="size-4" />
          </NavLink>
        </div>
      </div>

      <DashboardSegmentedNav
        active={mobileView}
        onChange={setMobileView}
        className="shrink-0 -mx-4 px-4 lg:hidden"
      />

      <TabPanelTransition panelKey={mobileView} className="lg:hidden">
        {mobileView === 'plans' ? (
          <PlanVsActualSection
            buckets={adherence.buckets}
            lineItems={adherence.lineItems}
            plannedTotal={adherence.plannedTotal}
            actualTotal={adherence.actualTotal}
            salaryReceived={salaryReceived}
            planBaseIncome={planBaseIncome}
            planIncomeSource={adherence.planIncomeSource}
            planIncomeContext={planIncomeContext}
            incomeBreakdown={incomeBreakdown}
            budgetPlanName={adherence.budgetPlanName}
          />
        ) : mobileView === 'overview' ? (
          <div className="space-y-3">
            <DashboardSearchBar />
            <DashboardRecentActivity transactions={overviewRecentTransactions} />
            <DashboardQuickActionGrid />
            <DashboardExploreGrid />
          </div>
        ) : (
          <div className="space-y-3">
            <section className="card-base shrink-0 p-3">
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
                  {mobileGoals.map((goal) => {
                    const goalDiscipline = disciplineSummary?.goals.find((g) => g.goalId === goal.id);
                    return (
                    <div key={goal.id} className="rounded-md border border-border bg-surface/40 p-3">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">{goal.name}</p>
                          <p className="text-[10px] text-muted">
                            {formatRupees(goal.currentAmount)} of {formatRupees(goal.targetAmount)}
                          </p>
                          {goalDiscipline?.monthlyRequired != null && (
                            <p className="mt-0.5 text-[10px] text-muted">
                              Need {formatDisciplineCurrency(goalDiscipline.monthlyRequired)}/mo
                              {disciplineSummary && (
                                <> · {formatDisciplineCurrency(disciplineSummary.capacity.available)} capacity</>
                              )}
                            </p>
                          )}
                        </div>
                        <Chip variant={goalStatusVariant(goal.status)} className="shrink-0 text-[10px]">
                          {goalStatusLabel(goal.status)}
                        </Chip>
                      </div>
                      <Progress value={goal.progressPercent} className="h-1.5" />
                    </div>
                    );
                  })}
                </div>
              )}
            </section>

            {topCategories.length > 0 && (
              <section className="card-base p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Where money went</h2>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <Link href="/transactions">View txns</Link>
                  </Button>
                </div>
                <CategoryLegend items={topCategories} />
              </section>
            )}

            {(segmentSplit.needs + segmentSplit.wants + segmentSplit.savings) > 0 && (
              <section className="card-base p-3">
                <h2 className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-hint">
                  Needs · Wants · Savings
                </h2>
                <SegmentSplitBar split={segmentSplit} />
              </section>
            )}

            {(stats.monthlyTrends?.length ?? 0) > 0 && (
              <section className="card-base p-3">
                <h2 className="mb-2 text-sm font-medium text-foreground">6-month spend trend</h2>
                <ul className="space-y-1.5 text-xs">
                  {(stats.monthlyTrends ?? []).slice(-6).map((t) => (
                    <li key={t.month} className="flex justify-between tabular-nums text-muted">
                      <span>{t.month}</span>
                      <span>
                        {formatRupees(t.expenses)} spent · {formatRupees(t.income)} in
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(stats.topPayees?.length ?? 0) > 0 && (
              <section className="card-base p-3">
                <h2 className="mb-2 text-sm font-medium text-foreground">Top payees</h2>
                <ul className="space-y-1.5 text-xs">
                  {(stats.topPayees ?? []).slice(0, 5).map((payee) => (
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
              </section>
            )}

          </div>
        )}
      </TabPanelTransition>

      {/* Desktop — search + shortcuts above main grid */}
      <div className="hidden space-y-4 lg:block">
        <DashboardSearchBar />
        <DashboardQuickActionGrid />
      </div>

      {/* Desktop summary */}
      <div className="hidden space-y-3 lg:block">
      {mobileAlerts.length > 0 && (
        <div className="card-base border-[var(--warning)]/30 bg-[var(--warning)]/5 p-4">
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
      </div>

      <div className="hidden min-h-0 grid-cols-1 gap-4 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:items-start">
        <div>
        <PlanVsActualSection
          buckets={adherence.buckets}
          lineItems={adherence.lineItems}
          plannedTotal={adherence.plannedTotal}
          actualTotal={adherence.actualTotal}
          salaryReceived={salaryReceived}
          planBaseIncome={planBaseIncome}
          planIncomeSource={adherence.planIncomeSource}
          planIncomeContext={planIncomeContext}
          incomeBreakdown={incomeBreakdown}
          budgetPlanName={adherence.budgetPlanName}
        />
        </div>

        <div className="flex flex-col gap-4">
          <section className="card-base shrink-0 p-4 max-lg:p-3">
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
            className="card-base p-4 max-lg:p-3"
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
        <div className="card-base hidden flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:flex">
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
