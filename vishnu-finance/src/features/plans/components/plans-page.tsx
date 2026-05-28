"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Goal, DeadlinesResponse, WishlistResponse } from "@/features/plans/types";
import {
  AlarmClock,
  LayoutGrid,
  Plus,
  RefreshCw,
  ShoppingCart,
  Target,
} from "lucide-react";
import { NavPill, NavPillGroup } from "@/components/ui/nav-pill";
import { PageHero } from "@/components/ui/hero";
import { patterns } from "@/design/patterns";
import { CompactListRow } from "@/components/ui/compact-list-row";
import { useIsMobile } from "@/hooks/use-breakpoint";
import { normalizeGoals } from "@/lib/utils/goal-normalize";
import {
  formatCurrency,
  usePlansInsights,
} from "@/features/plans/hooks/use-plans-insights";
import { cn } from "@/lib/utils";
import GoalsTab from "@/features/plans/components/goals-tab";
import DeadlinesTab from "@/features/plans/components/deadlines-tab";
import WishlistTab from "@/features/plans/components/wishlist-tab";

export interface PlansBootstrap {
  goals: Goal[];
  deadlines: DeadlinesResponse;
  wishlist: WishlistResponse;
}

interface PlansPageClientProps {
  bootstrap: PlansBootstrap;
  userId: string;
  defaultTab?: string;
}

const TABS = ['Overview', 'Goals', 'Deadlines', 'Wishlist'] as const;
type TabLabel = (typeof TABS)[number];

const TAB_META: Record<TabLabel, { icon: typeof LayoutGrid; mobileLabel: string }> = {
  Overview: { icon: LayoutGrid, mobileLabel: 'Home' },
  Goals: { icon: Target, mobileLabel: 'Goals' },
  Deadlines: { icon: AlarmClock, mobileLabel: 'Due' },
  Wishlist: { icon: ShoppingCart, mobileLabel: 'Wish' },
};

const TAB_FROM_PARAM: Record<string, TabLabel> = {
  overview: 'Overview',
  goals: 'Goals',
  deadlines: 'Deadlines',
  wishlist: 'Wishlist',
};

export default function PlansPage({ bootstrap, userId, defaultTab = "overview" }: PlansPageClientProps) {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabLabel>(
    TAB_FROM_PARAM[defaultTab.toLowerCase()] ?? 'Overview',
  );
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>(() => normalizeGoals(bootstrap.goals));
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setGoals(normalizeGoals(bootstrap.goals));
  }, [bootstrap.goals]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && TAB_FROM_PARAM[tabParam.toLowerCase()]) {
      setActiveTab(TAB_FROM_PARAM[tabParam.toLowerCase()]);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabLabel) => {
    setActiveTab(tab);
    router.replace(`/plans?tab=${tab.toLowerCase()}`, { scroll: false });
  };

  const { goalStats } = usePlansInsights({
    goals,
    deadlines: bootstrap.deadlines,
    wishlist: bootstrap.wishlist,
  });

  const totalTargetAmount = goalStats.target;
  const totalCurrentAmount = goalStats.invested;
  const completionPct = Math.min(100, (totalCurrentAmount / (totalTargetAmount || 1)) * 100);

  const refreshModule = async () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const upcomingDeadlines = useMemo(() => {
    const data = bootstrap.deadlines.data || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return data
      .filter(d => !d.isCompleted && new Date(d.dueDate) >= today)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [bootstrap.deadlines.data]);

  const wishlistItems = useMemo(() => bootstrap.wishlist.data || [], [bootstrap.wishlist.data]);

  const handleCreate = () => {
    if (activeTab === 'Goals') router.push('/plans?tab=goals&action=new');
    else if (activeTab === 'Deadlines') router.push('/plans?tab=deadlines&action=new');
    else if (activeTab === 'Wishlist') router.push('/plans?tab=wishlist&action=new');
    else router.push('/plans?tab=goals&action=new');
  };

  return (
    <>
        <PageHero
          tag="Financial planning"
          title="Plans"
          subtitle="Track goals, deadlines, and wishlist items in one place."
          className="max-md:[&>div:first-child]:hidden max-md:[&>div:last-child]:hidden"
        />

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <NavPillGroup className="w-full sm:w-auto">
            {TABS.map(tab => {
              const meta = TAB_META[tab];
              const Icon = meta.icon;
              return (
                <NavPill
                  key={tab}
                  label={isMobile ? meta.mobileLabel : tab}
                  icon={isMobile ? <Icon className="size-3.5" /> : undefined}
                  active={activeTab === tab}
                  onClick={() => handleTabChange(tab)}
                  className="max-md:min-w-[4.25rem] max-md:flex-col max-md:gap-0.5 max-md:px-2 max-md:py-1.5 max-md:text-[10px]"
                />
              );
            })}
          </NavPillGroup>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button variant="outline" size="sm" onClick={refreshModule} disabled={isRefreshing} className="max-md:px-2">
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin", "sm:mr-2")} />
              <span className="max-md:hidden">Refresh</span>
            </Button>
            <Button size="sm" onClick={handleCreate} className="max-md:px-2">
              <Plus className="size-3.5 sm:mr-2" />
              <span className="max-md:hidden">Add new</span>
            </Button>
          </div>
        </div>

        {activeTab === 'Overview' && (
          <div className="space-y-5">
            <div className="space-y-2 md:hidden">
              <div className="grid grid-cols-2 gap-2">
                <div className="card-base col-span-1 row-span-2 flex flex-col justify-between p-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Progress</p>
                  <p className="text-3xl font-semibold tabular-nums numeric">{completionPct.toFixed(0)}%</p>
                  <Progress value={completionPct} className="h-1.5" />
                </div>
                <div className="card-base p-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Goals</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums numeric">{goals.length}</p>
                </div>
                <div className="card-base p-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Wishlist</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums numeric">{wishlistItems.length}</p>
                </div>
              </div>
              <div className="card-base p-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Remaining</p>
                <p className="mt-1 text-xl font-semibold tabular-nums numeric">
                  {formatCurrency(totalTargetAmount - totalCurrentAmount)}
                </p>
              </div>
            </div>

            <section className={cn(patterns.cardGrid, 'hidden lg:grid-cols-4 md:grid')}>
              <div className="card-base p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Total target</p>
                <p className="mt-2 text-2xl font-medium tabular-nums numeric">{formatCurrency(totalTargetAmount)}</p>
              </div>
              <div className="card-base p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Progress</p>
                <p className="mt-2 text-2xl font-medium tabular-nums numeric">{completionPct.toFixed(1)}%</p>
                <Progress value={completionPct} className="mt-3 h-1.5" />
              </div>
              <div className="card-base p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Active goals</p>
                <p className="mt-2 text-2xl font-medium tabular-nums numeric">{goals.length}</p>
                <p className="mt-1 text-xs text-muted">{wishlistItems.length} wishlist items</p>
              </div>
              <div className="card-base p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Remaining</p>
                <p className="mt-2 text-2xl font-medium tabular-nums numeric">
                  {formatCurrency(totalTargetAmount - totalCurrentAmount)}
                </p>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <section className="card-base overflow-hidden lg:col-span-8">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <h2 className="text-sm font-medium text-foreground">Goals</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Goals')}
                    className="text-xs font-medium text-muted hover:text-foreground"
                  >
                    View all
                  </button>
                </div>
                <div className="hidden divide-y divide-border md:block">
                  {goals.slice(0, 10).map(goal => (
                    <div key={goal.id} className="px-5 py-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-medium text-foreground">{goal.title}</h3>
                        <span className="text-xs tabular-nums text-muted">
                          {((goal.currentAmount / goal.targetAmount) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={(goal.currentAmount / goal.targetAmount) * 100} className="h-1.5" />
                      <div className="mt-2 flex justify-between text-xs tabular-nums text-muted">
                        <span>{formatCurrency(goal.currentAmount)}</span>
                        <span>{formatCurrency(goal.targetAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="md:hidden">
                  {goals.slice(0, 3).map(goal => {
                    const pct = goal.targetAmount > 0
                      ? ((goal.currentAmount / goal.targetAmount) * 100).toFixed(0)
                      : '0';
                    return (
                      <CompactListRow
                        key={goal.id}
                        icon={<Target className="size-4 text-muted" />}
                        title={goal.title}
                        trailing={
                          <span className="text-xs text-muted">
                            {pct}% · {formatCurrency(goal.currentAmount)}
                          </span>
                        }
                      />
                    );
                  })}
                </div>
                  {goals.length === 0 && (
                    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                      <Target className="mb-3 size-10 text-hint" />
                      <p className="text-sm text-muted">No goals yet. Create one to get started.</p>
                    </div>
                  )}
              </section>

              <section className="card-base lg:col-span-4">
                <div className="border-b border-border px-5 py-3">
                  <h2 className="text-sm font-medium text-foreground">Upcoming deadlines</h2>
                </div>
                <div className="max-md:flex max-md:gap-2 max-md:overflow-x-auto max-md:p-3 md:space-y-3 md:p-5">
                  {upcomingDeadlines.slice(0, 3).map(deadline => (
                    <div key={deadline.id} className="rounded-md border border-border bg-surface p-4 max-md:min-w-[11rem] max-md:shrink-0">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[11px]">Due soon</Badge>
                        <span className="text-xs text-hint">
                          {new Date(deadline.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-foreground">{deadline.title}</h3>
                      <p className="mt-1 text-sm tabular-nums text-muted">{formatCurrency(deadline.amount)}</p>
                    </div>
                  ))}
                  {upcomingDeadlines.length === 0 && (
                    <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
                      <AlarmClock className="mx-auto mb-2 size-5 text-hint" />
                      <p className="text-sm text-muted">No upcoming deadlines.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'Goals' && (
          <GoalsTab initialGoals={goals} userId={userId} layoutVariant="embedded" onGoalsChange={setGoals} />
        )}
        {activeTab === 'Deadlines' && (
          <DeadlinesTab initialDeadlines={bootstrap.deadlines} userId={userId} layoutVariant="embedded" />
        )}
        {activeTab === 'Wishlist' && (
          <WishlistTab initialWishlist={bootstrap.wishlist} userId={userId} layoutVariant="embedded" />
        )}
    </>
  );
}
