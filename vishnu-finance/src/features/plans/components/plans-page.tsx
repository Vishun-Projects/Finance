"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Chip } from "@/components/ui/chip";
import type { Goal, Deadline, DeadlinesResponse, WishlistItem, WishlistResponse } from "@/features/plans/types";
import {
  AlarmClock,
  LayoutGrid,
  Moon,
  Plus,
  RefreshCw,
  ShoppingCart,
  Sun,
  Target,
} from "lucide-react";
import { NavPill, NavPillGroup } from "@/components/ui/nav-pill";
import { CompactListRow } from "@/components/ui/compact-list-row";
import { useIsMobile } from "@/hooks/use-breakpoint";
import { useMobileRefreshRegister } from '@/contexts/MobileRefreshContext';
import { useRouteBootstrap, clearAllAppRouteBootstraps } from '@/hooks/use-route-bootstrap';
import { isPlansBootstrapEmpty } from '@/lib/bootstrap-utils';
import { usePendingAction } from '@/hooks/use-pending-action';
import { normalizeGoals } from "@/lib/utils/goal-normalize";
import {
  formatCurrency,
  formatDateLabel,
  usePlansInsights,
} from "@/features/plans/hooks/use-plans-insights";
import { cn } from "@/lib/utils";
import { patterns } from "@/design/patterns";
import { groupDeadlinesForCurrentMonth } from "@/lib/utils/deadline-utils";
import {
  computeGoalMonthlyRequired,
  computeWishlistMonthlyRequired,
  formatDisciplineCurrency,
  type DisciplineSummary,
} from "@/lib/plans-discipline";
import type { PlanIncomeContext } from "@/lib/plan-income";
import type { CurrentAccountBalance } from "@/lib/account-balance-service";
import { PlanCapacityBanner } from "@/features/plans/components/plan-capacity-banner";
import { PageMandate } from '@/components/layout/page-mandate';
import { DataRecoveryBanner } from '@/components/feedback/data-recovery-banner';
import { TabPanelTransition } from '@/components/motion/tab-panel';
import { useTheme } from '@/contexts/ThemeContext';
import GoalsTab from "@/features/plans/components/goals-tab";
import DeadlinesTab from "@/features/plans/components/deadlines-tab";
import WishlistTab from "@/features/plans/components/wishlist-tab";

export interface PlansBootstrap {
  goals: Goal[];
  deadlines: DeadlinesResponse;
  wishlist: WishlistResponse;
  disciplineSummary?: DisciplineSummary | null;
  planIncomeContext?: PlanIncomeContext | null;
  accountBalance?: CurrentAccountBalance | null;
}

interface PlansPageClientProps {
  bootstrap: PlansBootstrap;
  userId: string;
  defaultTab?: string;
}

const TABS = ['Overview', 'Goals', 'Bills & dues', 'Wishlist'] as const;
type TabLabel = (typeof TABS)[number];

const TAB_META: Record<TabLabel, { icon: typeof LayoutGrid; mobileLabel: string }> = {
  Overview: { icon: LayoutGrid, mobileLabel: 'Home' },
  Goals: { icon: Target, mobileLabel: 'Goals' },
  'Bills & dues': { icon: AlarmClock, mobileLabel: 'Bills' },
  Wishlist: { icon: ShoppingCart, mobileLabel: 'Wish' },
};

const TAB_FROM_PARAM: Record<string, TabLabel> = {
  overview: 'Overview',
  goals: 'Goals',
  deadlines: 'Bills & dues',
  subscriptions: 'Bills & dues',
  wishlist: 'Wishlist',
};

const TAB_URL_PARAM: Record<TabLabel, string> = {
  Overview: 'overview',
  Goals: 'goals',
  'Bills & dues': 'deadlines',
  Wishlist: 'wishlist',
};

function addLabelForTab(tab: TabLabel): string {
  if (tab === 'Goals') return 'Add goal';
  if (tab === 'Bills & dues') return 'Add bill';
  if (tab === 'Wishlist') return 'Add wish';
  return 'Add goal';
}

export default function PlansPage({ bootstrap, userId, defaultTab = "overview" }: PlansPageClientProps) {
  const isMobile = useIsMobile();
  const cachedBootstrap = useRouteBootstrap('/plans', bootstrap, { isEmpty: isPlansBootstrapEmpty });
  const { setTheme, isLoading: themeLoading, isDark } = useTheme();
  const isDarkMode = !themeLoading && isDark;
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabLabel>(
    TAB_FROM_PARAM[defaultTab.toLowerCase()] ?? 'Overview',
  );
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>(() => normalizeGoals(cachedBootstrap.goals));
  const [deadlines, setDeadlines] = useState<Deadline[]>(() => cachedBootstrap.deadlines.data ?? []);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(() => cachedBootstrap.wishlist.data ?? []);
  const [disciplineSummary, setDisciplineSummary] = useState<DisciplineSummary | null>(
    cachedBootstrap.disciplineSummary ?? null,
  );
  const [entitiesLoadError, setEntitiesLoadError] = useState<string | null>(null);
  const { run: runRefresh, isPending: isRefreshing } = usePendingAction();

  const deadlinesResponse = useMemo<DeadlinesResponse>(
    () => ({ ...cachedBootstrap.deadlines, data: deadlines }),
    [cachedBootstrap.deadlines, deadlines],
  );
  const wishlistResponse = useMemo<WishlistResponse>(
    () => ({ ...cachedBootstrap.wishlist, data: wishlistItems }),
    [cachedBootstrap.wishlist, wishlistItems],
  );

  useEffect(() => {
    const next = normalizeGoals(cachedBootstrap.goals);
    setGoals((prev) => (next.length > 0 ? next : prev));
  }, [cachedBootstrap.goals]);

  useEffect(() => {
    const next = cachedBootstrap.deadlines.data ?? [];
    setDeadlines((prev) => (next.length > 0 ? next : prev));
  }, [cachedBootstrap.deadlines.data]);

  useEffect(() => {
    const next = cachedBootstrap.wishlist.data ?? [];
    setWishlistItems((prev) => (next.length > 0 ? next : prev));
  }, [cachedBootstrap.wishlist.data]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && TAB_FROM_PARAM[tabParam.toLowerCase()]) {
      setActiveTab(TAB_FROM_PARAM[tabParam.toLowerCase()]);
    }
  }, [searchParams]);

  const loadDiscipline = useCallback(async () => {
    try {
      const res = await fetch('/api/plans/discipline');
      if (res.ok) {
        setDisciplineSummary(await res.json());
      }
    } catch (error) {
      console.error('[plans] discipline fetch failed', error);
    }
  }, []);

  const refetchPlansEntities = useCallback(async () => {
    try {
      setEntitiesLoadError(null);
      const [goalsRes, deadlinesRes, wishlistRes] = await Promise.all([
        fetch(`/api/goals?userId=${encodeURIComponent(userId)}`),
        fetch(`/api/deadlines?userId=${encodeURIComponent(userId)}&page=1&pageSize=100`),
        fetch('/api/wishlist'),
      ]);

      let loadedAny = false;

      if (goalsRes.ok) {
        const data = (await goalsRes.json()) as Goal[];
        if (Array.isArray(data)) {
          const normalized = normalizeGoals(data);
          if (normalized.length > 0) {
            setGoals(normalized);
            loadedAny = true;
          }
        }
      }

      if (deadlinesRes.ok) {
        const payload = (await deadlinesRes.json()) as DeadlinesResponse | Deadline[];
        const rows = Array.isArray(payload) ? payload : payload.data ?? [];
        if (rows.length > 0) {
          setDeadlines(rows);
          loadedAny = true;
        }
      }

      if (wishlistRes.ok) {
        const payload = (await wishlistRes.json()) as WishlistResponse | WishlistItem[];
        const rows = Array.isArray(payload) ? payload : payload.data ?? [];
        if (rows.length > 0) {
          setWishlistItems(rows);
          loadedAny = true;
        }
      }

      if (!loadedAny && isPlansBootstrapEmpty(cachedBootstrap)) {
        setEntitiesLoadError('Could not load plans data. Check your connection and retry.');
      }
    } catch (error) {
      console.error('[plans] entity refetch failed', error);
      setEntitiesLoadError('Could not load plans data. Check your connection and retry.');
    }
  }, [userId, cachedBootstrap]);

  useEffect(() => {
    if (isPlansBootstrapEmpty(cachedBootstrap)) {
      void refetchPlansEntities();
    }
  }, [cachedBootstrap, refetchPlansEntities]);

  useEffect(() => {
    void loadDiscipline();
  }, [goals, deadlines, wishlistItems, loadDiscipline]);

  const handleTabChange = (tab: TabLabel) => {
    setActiveTab(tab);
    router.replace(`/plans?tab=${TAB_URL_PARAM[tab]}`, { scroll: false });
  };

  const {
    goalStats,
    deadlineStats,
    wishlistStats,
  } = usePlansInsights({
    goals,
    deadlines: deadlinesResponse,
    wishlist: wishlistResponse,
  });

  const deadlineGroups = useMemo(
    () => groupDeadlinesForCurrentMonth(deadlines),
    [deadlines],
  );

  const activeGoalsPreview = useMemo(
    () =>
      goals.filter(
        (g) =>
          g.status !== 'COMPLETED' &&
          (g.targetAmount <= 0 || g.currentAmount < g.targetAmount),
      ),
    [goals],
  );

  const refreshModule = useCallback(async () => {
    await runRefresh(async () => {
      clearAllAppRouteBootstraps();
      router.refresh();
      await Promise.all([refetchPlansEntities(), loadDiscipline()]);
    });
  }, [router, loadDiscipline, refetchPlansEntities, runRefresh]);

  useMobileRefreshRegister(refreshModule, '/plans');

  const handleCreate = () => {
    if (activeTab === 'Goals') router.push('/plans?tab=goals&action=new');
    else if (activeTab === 'Bills & dues') router.push('/plans?tab=deadlines&action=new');
    else if (activeTab === 'Wishlist') router.push('/plans?tab=wishlist&action=new');
    else router.push('/plans?tab=goals&action=new');
  };

  return (
    <div className={cn(patterns.pageColumn, 'min-w-0')}>
      <div className="safe-top shrink-0 -mx-4 flex items-start justify-between gap-2 px-4 pt-2">
        <PageMandate
          className="min-w-0 flex-1 mb-4"
          title="Plans"
          mandate={
            activeTab === 'Bills & dues'
              ? 'Your dues plus subscriptions active this month.'
              : 'Your commitments — goals, bills, and wishlist funding.'
          }
          metrics={
            activeTab === 'Bills & dues'
              ? [
                  { label: 'Due this month', value: String(deadlineStats.overdue + deadlineStats.upcoming) },
                  { label: 'Overdue', value: String(deadlineStats.overdue), tone: deadlineStats.overdue > 0 ? 'danger' : 'default' },
                  {
                    label: 'Required/mo',
                    value: disciplineSummary
                      ? formatDisciplineCurrency(disciplineSummary.totalRequiredPerMonth)
                      : '—',
                  },
                ]
              : [
                  {
                    label: 'Due this month',
                    value: String(deadlineStats.overdue + deadlineStats.upcoming),
                    href: '/plans?tab=deadlines',
                  },
                  {
                    label: 'Required/mo',
                    value: disciplineSummary
                      ? formatDisciplineCurrency(disciplineSummary.totalRequiredPerMonth)
                      : '—',
                  },
                  {
                    label: 'Active goals',
                    value: String(goalStats.active),
                    href: '/plans?tab=goals',
                  },
                ]
          }
        />
        <button
          type="button"
          onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
          className="btn-touch flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted hover:bg-surface hover:text-foreground lg:hidden"
          aria-label="Toggle theme"
          suppressHydrationWarning
        >
          {isDarkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>
      </div>

      {entitiesLoadError ? (
        <DataRecoveryBanner
          message={entitiesLoadError}
          onRetry={() => void refetchPlansEntities()}
          loading={isRefreshing}
          className="mb-3"
        />
      ) : null}

      <div className="mb-3 flex shrink-0 flex-col gap-2 max-lg:mb-2 lg:mb-5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
        {isMobile ? (
          <NavPillGroup variant="segmented" className="w-full shrink-0 -mx-4 px-4">
            {TABS.map((tab) => {
              const meta = TAB_META[tab];
              const Icon = meta.icon;
              return (
                <NavPill
                  key={tab}
                  variant="segmented"
                  label={meta.mobileLabel}
                  icon={<Icon className="size-3.5 shrink-0" />}
                  active={activeTab === tab}
                  onClick={() => handleTabChange(tab)}
                />
              );
            })}
          </NavPillGroup>
        ) : (
          <NavPillGroup className="w-full shrink-0 lg:w-auto">
            {TABS.map((tab) => {
              const meta = TAB_META[tab];
              const Icon = meta.icon;
              return (
                <NavPill
                  key={tab}
                  label={tab}
                  icon={<Icon className="size-3.5" />}
                  active={activeTab === tab}
                  onClick={() => handleTabChange(tab)}
                />
              );
            })}
          </NavPillGroup>
        )}

        <div className="flex items-center gap-2 lg:ml-auto">
          <Button variant="outline" size="sm" onClick={refreshModule} disabled={isRefreshing} className="gap-1.5">
            <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleCreate} className="gap-1.5">
            <Plus className="size-3.5" />
            <span>{addLabelForTab(activeTab)}</span>
          </Button>
        </div>
      </div>

      <TabPanelTransition panelKey={activeTab}>
      {activeTab === 'Overview' && (
        <div className="space-y-5 lg:space-y-6">
          {disciplineSummary && (
            <PlanCapacityBanner
              summary={disciplineSummary}
              planIncomeContext={bootstrap.planIncomeContext ?? undefined}
              planIncomeSource={disciplineSummary.capacity.planIncomeSource}
            />
          )}

          {(deadlineGroups.overdue.length > 0 ||
            deadlineGroups.thisMonthUpcoming.length > 0 ||
            activeGoalsPreview.length > 0) && (
            <section className="card-base p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-foreground">Next up</h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleTabChange('Bills & dues')}>
                    All bills
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleTabChange('Goals')}>
                    All goals
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {deadlineGroups.overdue[0] && (
                  <CompactListRow
                    icon={<AlarmClock className="size-4 text-[var(--danger)]" />}
                    title={deadlineGroups.overdue[0].title}
                    subtitle="Overdue"
                    trailing={formatCurrency(deadlineGroups.overdue[0].amount)}
                    onClick={() => handleTabChange('Bills & dues')}
                  />
                )}
                {!deadlineGroups.overdue[0] && deadlineGroups.thisMonthUpcoming[0] && (
                  <CompactListRow
                    icon={<AlarmClock className="size-4 text-muted" />}
                    title={deadlineGroups.thisMonthUpcoming[0].title}
                    subtitle={formatDateLabel(deadlineGroups.thisMonthUpcoming[0].dueDate)}
                    trailing={formatCurrency(deadlineGroups.thisMonthUpcoming[0].amount)}
                    onClick={() => handleTabChange('Bills & dues')}
                  />
                )}
                {activeGoalsPreview[0] && (
                  <CompactListRow
                    icon={<Target className="size-4 text-muted" />}
                    title={activeGoalsPreview[0].title}
                    subtitle={`${Math.min(100, Math.round((activeGoalsPreview[0].currentAmount / (activeGoalsPreview[0].targetAmount || 1)) * 100))}% saved`}
                    onClick={() => handleTabChange('Goals')}
                  />
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'Goals' && (
        <GoalsTab
          initialGoals={goals}
          userId={userId}
          layoutVariant="embedded"
          onGoalsChange={setGoals}
          disciplineSummary={disciplineSummary}
        />
      )}
      {activeTab === 'Bills & dues' && (
        <DeadlinesTab
          initialDeadlines={deadlinesResponse}
          userId={userId}
          layoutVariant="embedded"
          onDeadlinesChange={setDeadlines}
          disciplineSummary={disciplineSummary}
        />
      )}
      {activeTab === 'Wishlist' && (
        <WishlistTab
          initialWishlist={wishlistResponse}
          userId={userId}
          layoutVariant="embedded"
          onWishlistChange={setWishlistItems}
        />
      )}
      </TabPanelTransition>
    </div>
  );
}
