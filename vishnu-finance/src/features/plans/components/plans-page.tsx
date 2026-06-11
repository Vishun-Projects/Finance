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
import { PageHero } from "@/components/ui/hero";
import { CompactListRow } from "@/components/ui/compact-list-row";
import { useIsMobile } from "@/hooks/use-breakpoint";
import { useMobileRefreshRegister } from "@/contexts/MobileRefreshContext";
import { normalizeGoals } from "@/lib/utils/goal-normalize";
import {
  formatCurrency,
  formatDateLabel,
  usePlansInsights,
} from "@/features/plans/hooks/use-plans-insights";
import { cn, formatCompactRupees } from "@/lib/utils";
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
  const { setTheme, isLoading: themeLoading, isDark } = useTheme();
  const isDarkMode = !themeLoading && isDark;
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabLabel>(
    TAB_FROM_PARAM[defaultTab.toLowerCase()] ?? 'Overview',
  );
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>(() => normalizeGoals(bootstrap.goals));
  const [deadlines, setDeadlines] = useState<Deadline[]>(() => bootstrap.deadlines.data ?? []);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(() => bootstrap.wishlist.data ?? []);
  const [disciplineSummary, setDisciplineSummary] = useState<DisciplineSummary | null>(
    bootstrap.disciplineSummary ?? null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const deadlinesResponse = useMemo<DeadlinesResponse>(
    () => ({ ...bootstrap.deadlines, data: deadlines }),
    [bootstrap.deadlines, deadlines],
  );
  const wishlistResponse = useMemo<WishlistResponse>(
    () => ({ ...bootstrap.wishlist, data: wishlistItems }),
    [bootstrap.wishlist, wishlistItems],
  );

  useEffect(() => {
    setGoals(normalizeGoals(bootstrap.goals));
  }, [bootstrap.goals]);

  useEffect(() => {
    setDeadlines(bootstrap.deadlines.data ?? []);
  }, [bootstrap.deadlines.data]);

  useEffect(() => {
    setWishlistItems(bootstrap.wishlist.data ?? []);
  }, [bootstrap.wishlist.data]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && TAB_FROM_PARAM[tabParam.toLowerCase()]) {
      setActiveTab(TAB_FROM_PARAM[tabParam.toLowerCase()]);
    }
  }, [searchParams]);

  useEffect(() => {
    setDisciplineSummary(bootstrap.disciplineSummary ?? null);
  }, [bootstrap.disciplineSummary]);

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
    setIsRefreshing(true);
    try {
      router.refresh();
      await loadDiscipline();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  }, [router, loadDiscipline]);

  useMobileRefreshRegister(refreshModule);

  const handleCreate = () => {
    if (activeTab === 'Goals') router.push('/plans?tab=goals&action=new');
    else if (activeTab === 'Bills & dues') router.push('/plans?tab=deadlines&action=new');
    else if (activeTab === 'Wishlist') router.push('/plans?tab=wishlist&action=new');
    else router.push('/plans?tab=goals&action=new');
  };

  return (
    <div className={cn(
      patterns.pageColumn,
      'min-w-0',
      'max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-hidden',
    )}>
      <div className="safe-top shrink-0 -mx-4 flex items-start justify-between gap-2 px-4 pt-2 lg:hidden">
        <PageMandate
          className="min-w-0 flex-1"
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
          className="btn-touch flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted hover:bg-surface hover:text-foreground"
          aria-label="Toggle theme"
          suppressHydrationWarning
        >
          {isDarkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>
      </div>

      <PageMandate
        className="mb-4 hidden shrink-0 lg:block"
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

      <div className="mb-5 hidden lg:block">
        <PageHero
          tag="Financial planning"
          title="Plans"
          subtitle="Track goals, dues, and wishlist — and see if your monthly commitments fit."
          className="mb-0"
        />
      </div>

      <div className="mb-3 flex shrink-0 flex-col gap-2 max-lg:mb-2 lg:mb-5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
        <NavPillGroup className="w-full shrink-0 lg:w-auto">
            {TABS.map((tab) => {
              const meta = TAB_META[tab];
              const Icon = meta.icon;
              return (
              <NavPill
                key={tab}
                label={isMobile ? meta.mobileLabel : tab}
                icon={isMobile ? <Icon className="size-3.5" /> : undefined}
                active={activeTab === tab}
                onClick={() => handleTabChange(tab)}
                className="max-lg:min-w-[4.25rem] max-lg:flex-col max-lg:gap-0.5 max-lg:px-2 max-lg:py-1.5 max-lg:text-[10px]"
              />
            );
          })}
        </NavPillGroup>

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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-bottom-bar lg:overflow-visible lg:pb-0">
        <div className="custom-scrollbar scroll-pb-bottom-bar min-h-0 flex-1 overflow-y-auto overscroll-contain lg:overflow-visible">
      {activeTab === 'Overview' && (
        <div className="space-y-5 lg:space-y-6">
          {disciplineSummary && (
            <PlanCapacityBanner
              summary={disciplineSummary}
              planIncomeContext={bootstrap.planIncomeContext ?? undefined}
              planIncomeSource={disciplineSummary.capacity.planIncomeSource}
            />
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <div className="card-base p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Active goals</p>
              <p className="mt-1 text-xl font-semibold tabular-nums numeric">{goalStats.active}</p>
              <p className="mt-0.5 text-[10px] text-muted">{goalStats.progressPercent}% saved</p>
            </div>
            <div className="card-base p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Due this month</p>
              <p className="mt-1 text-xl font-semibold tabular-nums numeric">
                {deadlineStats.overdue + deadlineStats.upcoming}
              </p>
              <p className="mt-0.5 text-[10px] text-muted">{deadlineStats.overdue} overdue</p>
            </div>
            <div className="card-base p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Wishlist</p>
              <p className="mt-1 text-xl font-semibold tabular-nums numeric">{wishlistStats.pending}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted" title={formatCurrency(wishlistStats.totalCost)}>
                {formatCompactRupees(wishlistStats.totalCost)} total
              </p>
            </div>
            <div className="card-base p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Required/mo</p>
              <p className="mt-1 text-xl font-semibold tabular-nums numeric">
                {disciplineSummary
                  ? formatDisciplineCurrency(disciplineSummary.totalRequiredPerMonth)
                  : '—'}
              </p>
              <p className="mt-0.5 text-[10px] text-muted">Commitments total</p>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}
