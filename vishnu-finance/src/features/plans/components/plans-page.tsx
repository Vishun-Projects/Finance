"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Goal, Deadline, DeadlinesResponse, WishlistItem, WishlistResponse } from "@/features/plans/types";
import {
  Plus,
  RefreshCw,
} from "lucide-react";
import { useMobileRefreshRegister } from '@/contexts/MobileRefreshContext';
import { useRouteBootstrap, clearAllAppRouteBootstraps } from '@/hooks/use-route-bootstrap';
import { isPlansBootstrapEmpty } from '@/lib/bootstrap-utils';
import { usePendingAction } from '@/hooks/use-pending-action';
import { normalizeGoals } from "@/lib/utils/goal-normalize";
import {
  formatDisciplineCurrency,
  type DisciplineSummary,
} from "@/lib/plans-discipline";
import type { PlanIncomeContext } from "@/lib/plan-income";
import type { CurrentAccountBalance } from "@/lib/account-balance-service";
import { PageMandate } from '@/components/layout/page-mandate';
import { DataRecoveryBanner } from '@/components/feedback/data-recovery-banner';
import { TabPanelTransition } from '@/components/motion/tab-panel';
import { MobileStickyTabs } from '@/components/ui/mobile-sticky-tabs';
import {
  formatCurrency,
  usePlansInsights,
} from "@/features/plans/hooks/use-plans-insights";
import { cn } from "@/lib/utils";
import { patterns } from "@/design/patterns";
import { groupDeadlinesForCurrentMonth } from "@/lib/utils/deadline-utils";
import { PlansOverviewPanel } from "@/features/plans/components/plans-overview-panel";
import GoalsTab from "@/features/plans/components/goals-tab";
import DeadlinesTab from "@/features/plans/components/deadlines-tab";
import WishlistTab from "@/features/plans/components/wishlist-tab";
import { MobileScrollEndSpacer } from '@/components/layout/mobile-scroll-end-spacer';

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

const MOBILE_TABS = [
  { id: 'Overview', label: 'Overview', shortLabel: 'Home' },
  { id: 'Goals', label: 'Goals' },
  { id: 'Bills & dues', label: 'Bills & dues', shortLabel: 'Bills' },
  { id: 'Wishlist', label: 'Wishlist', shortLabel: 'Wish' },
] as const;

function addLabelForTab(tab: TabLabel): string {
  if (tab === 'Goals') return 'Add goal';
  if (tab === 'Bills & dues') return 'Add bill';
  if (tab === 'Wishlist') return 'Add wish';
  return 'Add goal';
}

export default function PlansPage({ bootstrap, userId, defaultTab = "overview" }: PlansPageClientProps) {
  const cachedBootstrap = useRouteBootstrap('/plans', bootstrap, {
    isEmpty: isPlansBootstrapEmpty,
    userId,
  });
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
    <div className={cn(patterns.pageColumn, 'min-w-0 pb-8')}>
      <div className="mb-2 shrink-0 lg:mb-3">
        <PageMandate
          className="min-w-0"
          hideTitleOnMobile
          title="Plans"
          mandate={
            activeTab === 'Bills & dues'
              ? 'Dues and subscriptions for this month.'
              : 'Goals, bills, and wishlist funding in one place.'
          }
          metrics={
            activeTab === 'Bills & dues'
              ? [
                  { label: 'Due', value: String(deadlineStats.overdue + deadlineStats.upcoming) },
                  {
                    label: 'Overdue',
                    value: String(deadlineStats.overdue),
                    tone: deadlineStats.overdue > 0 ? 'danger' : 'default',
                  },
                  {
                    label: 'Required/mo',
                    value: disciplineSummary
                      ? formatDisciplineCurrency(disciplineSummary.totalRequiredPerMonth)
                      : '—',
                  },
                ]
              : [
                  {
                    label: 'Due',
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
                    label: 'Goals',
                    value: String(goalStats.active),
                    href: '/plans?tab=goals',
                  },
                ]
          }
        />
      </div>

      {entitiesLoadError ? (
        <DataRecoveryBanner
          message={entitiesLoadError}
          onRetry={() => void refetchPlansEntities()}
          loading={isRefreshing}
          className="mb-3"
        />
      ) : null}

      <MobileStickyTabs
        tabs={[...MOBILE_TABS]}
        activeId={activeTab}
        onChange={(id) => handleTabChange(id as TabLabel)}
        underGlobalTopBar
        className="mb-3 lg:mb-4"
      />

      <div className="mb-3 flex shrink-0 items-center gap-2 lg:mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshModule}
          disabled={isRefreshing}
          className="h-8 gap-1.5 bg-surface px-2.5"
        >
          <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
        <Button size="sm" onClick={handleCreate} className="h-8 gap-1.5">
          <Plus className="size-3.5" />
          <span>{addLabelForTab(activeTab)}</span>
        </Button>
        {activeTab === 'Overview' && goalStats.invested > 0 ? (
          <p className="ml-auto hidden text-xs text-muted sm:block">
            {formatCurrency(goalStats.invested)} saved toward goals
          </p>
        ) : null}
      </div>

      <TabPanelTransition panelKey={activeTab}>
      {activeTab === 'Overview' && (
        <PlansOverviewPanel
          disciplineSummary={disciplineSummary}
          planIncomeContext={cachedBootstrap.planIncomeContext ?? bootstrap.planIncomeContext}
          accountBalance={cachedBootstrap.accountBalance ?? bootstrap.accountBalance}
          goalStats={goalStats}
          deadlineStats={deadlineStats}
          wishlistStats={wishlistStats}
          activeGoals={activeGoalsPreview}
          overdueDeadlines={deadlineGroups.overdue}
          upcomingDeadlines={deadlineGroups.thisMonthUpcoming}
          onOpenGoals={() => handleTabChange('Goals')}
          onOpenBills={() => handleTabChange('Bills & dues')}
          onOpenWishlist={() => handleTabChange('Wishlist')}
        />
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
      <MobileScrollEndSpacer />
    </div>
  );
}
