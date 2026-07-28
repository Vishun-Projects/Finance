'use client';

import { NavLink } from '@/components/layout/nav-link';
import { useRouter } from 'next/navigation';
import { startOfDay } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Moon,
  Settings,
  Sun,
} from 'lucide-react';
import { patterns } from '@/design/patterns';
import type { DashboardBootstrap } from '@/features/dashboard/types';
import { PlanVsActualSection } from '@/features/dashboard/components/plan-vs-actual-section';
import { DashboardDesktop } from '@/features/dashboard/components/dashboard-desktop';
import { cn, formatRupees } from '@/lib/utils';
import {
  DashboardSegmentedNav,
  type DashboardMobileView,
} from '@/features/dashboard/components/dashboard-segmented-nav';
import { DashboardSearchBar } from '@/features/dashboard/components/dashboard-search-bar';
import { DashboardRecentActivity } from '@/features/dashboard/components/dashboard-recent-activity';
import { DashboardQuickActionGrid } from '@/features/dashboard/components/dashboard-quick-action-grid';
import { DashboardExploreGrid } from '@/features/dashboard/components/dashboard-explore-grid';
import { DashboardGoalsList } from '@/features/dashboard/components/dashboard-goals-list';
import { DashboardInsightsStack } from '@/features/dashboard/components/dashboard-insights-stack';
import { PageMandate, type PageMandateMetric } from '@/components/layout/page-mandate';
import { TabPanelTransition } from '@/components/motion/tab-panel';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  computeNeedsWantsSavingsSplit,
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

export default function DashboardPage({ data: serverData }: DashboardPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const data = useRouteBootstrap('/dashboard', serverData, {
    isEmpty: isDashboardBootstrapEmpty,
    userId: user?.id,
  });
  const { stats, adherence, disciplineSummary: initialDisciplineSummary, planIncomeContext } = data;
  const { currentMonthStats, incomeBreakdown } = stats;
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

  const segmentSplit = useMemo(() => computeNeedsWantsSavingsSplit(adherence.buckets), [adherence.buckets]);
  const topCategories = useMemo(
    () => getTopCategoriesWithPct(stats.categoryBreakdown ?? [], 5),
    [stats.categoryBreakdown],
  );

  const alerts: string[] = [
    ...overBudgetBuckets.map((bucket) => `${bucket.label} is over plan by ${formatRupees(bucket.actual - bucket.planned)}`),
    ...overdueDeadlines.slice(0, 2).map((item) => `Overdue: ${item.title}`),
    ...adherence.goals
      .filter((goal) => goal.status === 'behind')
      .slice(0, 2)
      .map((goal) => `Goal behind pace: ${goal.name}`),
  ];

  const isLgUp = useBreakpoint('lg');
  const mobileAlerts = alerts.slice(0, isLgUp ? 4 : 2);
  const mobileGoals = adherence.goals.slice(0, isLgUp ? 5 : 2);
  const overviewRecentTransactions = stats.recentTransactions.slice(0, 3);
  const activityRecentTransactions = stats.recentTransactions.slice(0, 5);
  const desktopRecentTransactions = stats.recentTransactions.slice(0, 8);
  const hasMonthActivity =
    (currentMonthStats.income ?? 0) !== 0 ||
    (currentMonthStats.expenses ?? 0) !== 0 ||
    (stats.recentTransactions?.length ?? 0) > 0;

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

  const mandateMetrics = useMemo((): PageMandateMetric[] => [
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
  ], [
    displayNetFlow,
    combinedPlanScore,
    safeToSpend,
    upcomingSoonDeadlines.length,
    mobileAlerts,
  ]);

  const goalMetaById = useMemo(() => {
    const map: Record<string, { detailLine?: string }> = {};
    for (const goal of mobileGoals) {
      const goalDiscipline = disciplineSummary?.goals.find((g) => g.goalId === goal.id);
      if (goalDiscipline?.monthlyRequired == null) continue;
      map[goal.id] = {
        detailLine: `Need ${formatDisciplineCurrency(goalDiscipline.monthlyRequired)}/mo${
          disciplineSummary
            ? ` · ${formatDisciplineCurrency(disciplineSummary.capacity.available)} capacity`
            : ''
        }`,
      };
    }
    return map;
  }, [mobileGoals, disciplineSummary]);

  return (
    <div className={cn(patterns.pageFluid, 'flex flex-col gap-3 pb-4 lg:gap-4 lg:pb-8')}>
      <div className="safe-top -mx-4 flex items-start justify-between gap-2 px-4 pt-2 lg:hidden">
        <PageMandate
          className="min-w-0 flex-1"
          title={adherence.monthLabel}
          mandate="This month at a glance — pulse, search, and shortcuts."
          metrics={mandateMetrics}
        />
        <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
          <button
            type="button"
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className="btn-touch flex size-9 items-center justify-center rounded-full bg-surface text-muted hover:text-foreground"
            aria-label="Toggle theme"
            suppressHydrationWarning
          >
            {isDarkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>
          <NavLink
            href="/settings"
            linkClassName="flex shrink-0"
            className="btn-touch flex size-9 items-center justify-center rounded-full bg-surface text-muted hover:text-foreground"
            aria-label="Settings"
          >
            <Settings className="size-4" />
          </NavLink>
        </div>
      </div>

      <div
        data-dashboard-sticky
        className="sticky top-0 z-40 -mx-4 isolate bg-background/95 px-4 backdrop-blur-md lg:hidden"
      >
        <DashboardSegmentedNav active={mobileView} onChange={setMobileView} className="shrink-0" />
      </div>

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
          <div className="space-y-2.5">
            <DashboardSearchBar />
            <DashboardRecentActivity
              transactions={overviewRecentTransactions}
              hasMonthActivity={hasMonthActivity}
            />
            <DashboardQuickActionGrid />
            <DashboardExploreGrid />
          </div>
        ) : (
          <div className="space-y-2.5">
            {activityRecentTransactions.length > 0 && (
              <DashboardRecentActivity transactions={activityRecentTransactions} />
            )}

            <DashboardGoalsList goals={mobileGoals} metaByGoalId={goalMetaById} dense />

            <DashboardInsightsStack
              dense
              topCategories={topCategories}
              segmentSplit={segmentSplit}
              monthlyTrends={stats.monthlyTrends ?? []}
              topPayees={stats.topPayees ?? []}
            />
          </div>
        )}
      </TabPanelTransition>

      <DashboardDesktop
        title={adherence.monthLabel}
        mandate="This month at a glance — pulse and plan progress."
        metrics={mandateMetrics}
        adherence={adherence}
        stats={stats}
        planIncomeContext={planIncomeContext}
        incomeBreakdown={incomeBreakdown}
        salaryReceived={salaryReceived}
        planBaseIncome={planBaseIncome}
        alerts={mobileAlerts}
        goals={mobileGoals}
        recentTransactions={desktopRecentTransactions}
        topCategories={topCategories}
      />
    </div>
  );
}
