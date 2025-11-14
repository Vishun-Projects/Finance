"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";
import GoalsPageClient from "@/app/(app)/goals/page-client";
import DeadlinesPageClient from "@/app/(app)/deadlines/page-client";
import WishlistPageClient from "@/app/(app)/wishlist/page-client";
import type { Goal } from "@/types/goals";
import type { DeadlinesResponse } from "@/types/deadlines";
import type { WishlistResponse } from "@/types/wishlist";
import {
  AlarmClock,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  HeartHandshake,
  ShoppingBag,
  Sparkles,
  Target,
} from "lucide-react";
import { normalizeGoals } from "@/lib/utils/goal-normalize";
import {
  buildDeadlineSecondary,
  formatCurrency,
  formatDateLabel,
  formatPriorityLabel,
  usePlansInsights,
  type TabKey,
} from "@/hooks/use-plans-insights";
import { MobileWorkspaceChips } from "@/components/plans/mobile/mobile-workspace-chips";
import { MobileSnapshotCard } from "@/components/plans/mobile/mobile-snapshot-card";
import { MobileWorkspaceCard } from "@/components/plans/mobile/mobile-workspace-card";
import { MobileActionMenu } from "@/components/plans/mobile/mobile-action-menu";
import { MobileWorkspaceSheet } from "@/components/plans/mobile/mobile-workspace-sheet";

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

const TAB_VALUES: TabKey[] = ["goals", "deadlines", "wishlist"];

type IconComponent = ComponentType<{ className?: string }>;

export default function PlansPageClient({ bootstrap, userId, defaultTab = "goals" }: PlansPageClientProps) {
  const initialTab: TabKey = TAB_VALUES.includes(defaultTab as TabKey)
    ? (defaultTab as TabKey)
    : "goals";

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [highlightedTab, setHighlightedTab] = useState<TabKey | null>(null);
  const [mobileWorkspace, setMobileWorkspace] = useState<TabKey | null>(null);
  const tabsSectionRef = useRef<HTMLDivElement | null>(null);
  const [goals, setGoals] = useState<Goal[]>(() => normalizeGoals(bootstrap.goals));

  useEffect(() => {
    setGoals(normalizeGoals(bootstrap.goals));
  }, [bootstrap.goals]);

  const handleGoalsChange = useCallback((nextGoals: Goal[]) => {
    const normalized = normalizeGoals(nextGoals);
    setGoals((prev) => (goalsEqual(prev, normalized) ? prev : normalized));
  }, []);

  const {
    goalStats,
    deadlineStats,
    wishlistStats,
    highlightedGoal,
    nextDeadline,
    nextWishlist,
    planFilterOptions,
    tabSummaries,
    mobileWorkspaceCards,
  } = usePlansInsights({
    goals,
    deadlines: bootstrap.deadlines,
    wishlist: bootstrap.wishlist,
  });

  const overviewUpdatedLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date());
  }, []);

  const handleWorkspaceNavigate = useCallback(
    (tab: TabKey, { autoScroll = true }: { autoScroll?: boolean } = {}) => {
      setActiveTab(tab);
      setHighlightedTab(tab);
      if (autoScroll && typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          tabsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    },
    [],
  );

  const openMobileWorkspace = useCallback(
    (tab: TabKey) => {
      setActiveTab(tab);
      setMobileWorkspace(tab);
    },
    [],
  );

  const renderWorkspaceContent = useCallback(
    (tab: TabKey) => {
      switch (tab) {
        case "goals":
          return (
            <GoalsPageClient
              initialGoals={goals}
              userId={userId}
              layoutVariant="embedded"
              onGoalsChange={handleGoalsChange}
            />
          );
        case "deadlines":
          return (
            <DeadlinesPageClient
              initialDeadlines={bootstrap.deadlines}
              userId={userId}
              layoutVariant="embedded"
            />
          );
        case "wishlist":
          return (
            <WishlistPageClient
              initialWishlist={bootstrap.wishlist}
              userId={userId}
              layoutVariant="embedded"
            />
          );
        default:
          return null;
      }
    },
    [bootstrap.deadlines, bootstrap.wishlist, goals, handleGoalsChange, userId],
  );

  const closeMobileWorkspace = useCallback(() => {
    setMobileWorkspace(null);
  }, []);

  const handleTabValueChange = useCallback((value: string) => {
    if (isTabKey(value)) {
      setActiveTab(value as TabKey);
    }
  }, []);

  useEffect(() => {
    if (!highlightedTab) return;
    const timeout = window.setTimeout(() => setHighlightedTab(null), 1400);
    return () => window.clearTimeout(timeout);
  }, [highlightedTab]);


  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-4 sm:px-6 md:pb-20 lg:px-8">
      <header className="space-y-4">
        <Badge variant="outline" className="w-fit rounded-full border-primary/40 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          Plans workspace
        </Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Plans</h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Review progress, upcoming payments, and wishlist priorities in a layout tuned for every screen.
          </p>
        </div>
      </header>

      <div className="md:hidden space-y-6">
        <MobileWorkspaceChips
          active={mobileWorkspace ?? activeTab}
          options={planFilterOptions}
          onSelect={openMobileWorkspace}
        />

        <MobileSnapshotCard
          goalStats={goalStats}
          deadlineStats={deadlineStats}
          wishlistStats={wishlistStats}
          updatedLabel={overviewUpdatedLabel}
        />

        <div className="space-y-4">
          {mobileWorkspaceCards.map((workspace) => (
            <MobileWorkspaceCard
              key={workspace.value}
              data={workspace}
              onOpen={() => openMobileWorkspace(workspace.value)}
            />
          ))}
        </div>

        <MobileActionMenu onOpenWorkspace={openMobileWorkspace} />
      </div>

      <div className="hidden md:flex md:flex-col md:gap-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr),minmax(0,1fr)]">
          <div className="space-y-4">
        <Card className="relative overflow-hidden border border-border/60 bg-card/95 text-card-foreground shadow-lg backdrop-blur-sm dark:border-border/40 dark:bg-background/80">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/0 to-primary/0 dark:from-primary/25 dark:via-primary/10 dark:to-transparent" />
          <CardHeader className="relative z-10 space-y-4 pb-4 sm:pb-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="h-4 w-4" />
                <span>Overview</span>
              </div>
              <span className="text-xs text-muted-foreground sm:text-sm">Updated {overviewUpdatedLabel}</span>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold sm:text-3xl">
                {goalStats.progressPercent >= 100 ? 'Goals achieved — amazing work!' : 'Stay on track with every plan'}
            </CardTitle>
              <p className="max-w-xl text-sm text-muted-foreground">
                {goalStats.progressPercent >= 100
                  ? 'All targets have been reached. Keep nurturing new goals to stay ahead.'
                  : 'You are steadily investing towards your targets. See what needs attention next at a glance.'}
              </p>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 space-y-5 pb-6">
            <div className="grid gap-2 sm:grid-cols-3">
              <HeroStat
                icon={ClipboardCheck}
                label="Goals"
                primary={`${goalStats.active} active`}
                secondary={`${goalStats.completed} completed`}
              />
              <HeroStat
                icon={CalendarDays}
                label="Deadlines"
                primary={`${deadlineStats.upcoming} upcoming`}
                secondary={`${deadlineStats.overdue} overdue`}
              />
              <HeroStat
                icon={HeartHandshake}
                label="Wishlist"
                primary={`${wishlistStats.pending} pending`}
                secondary={`${wishlistStats.completed} completed`}
              />
            </div>
            <div className="space-y-3 rounded-2xl border border-primary/20 bg-background/80 p-4 shadow-sm dark:border-primary/30 dark:bg-background/60">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Investment progress</span>
                <span>{goalStats.progressPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, goalStats.progressPercent))}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(goalStats.invested)} invested of {formatCurrency(goalStats.target)} across all goals.
              </p>
            </div>
          </CardContent>
        </Card>
          </div>

        <Card className="border border-border/60 bg-card/95 text-card-foreground shadow-sm dark:border-border/40 dark:bg-background/80">
          <CardHeader className="space-y-3 pb-3 sm:pb-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <CardTitle className="text-xl font-semibold text-foreground">Today&apos;s focus</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Quick reminders for what needs your attention next. Tap to jump right in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-4 sm:space-y-4 sm:pb-6">
            <ReminderRow
              icon={Target}
              label="Priority goal"
              primary={highlightedGoal ? highlightedGoal.title : 'No active goals'}
              secondary={
                highlightedGoal
                  ? `${formatCurrency(highlightedGoal.currentAmount)} of ${formatCurrency(
                      highlightedGoal.targetAmount,
                    )} • ${highlightedGoal.targetDate ? formatDateLabel(highlightedGoal.targetDate) : 'No date set'}`
                  : 'Create a goal to start tracking your progress.'
              }
              actionLabel="Open goals"
              onAction={() => handleWorkspaceNavigate('goals')}
            />
            <ReminderRow
              icon={AlarmClock}
              label="Next deadline"
              primary={nextDeadline ? nextDeadline.title : 'All caught up'}
              secondary={
                nextDeadline
                  ? buildDeadlineSecondary(nextDeadline)
                  : 'Add a reminder so you never miss an important payment.'
              }
              actionLabel="View deadlines"
              onAction={() => handleWorkspaceNavigate('deadlines')}
            />
            <ReminderRow
              icon={ShoppingBag}
              label="Top wishlist item"
              primary={nextWishlist ? nextWishlist.title : 'Nothing queued'}
              secondary={
                nextWishlist
                  ? `${formatCurrency(nextWishlist.estimatedCost)} • ${formatPriorityLabel(nextWishlist.priority)} priority`
                  : 'Add something you are planning to invest in next.'
              }
              actionLabel="Review wishlist"
              onAction={() => handleWorkspaceNavigate('wishlist')}
            />
          </CardContent>
        </Card>
      </section>

        <div className="sticky top-28 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-4">
            <div className="min-w-[220px] flex-1 max-w-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</div>
            <p className="text-sm text-muted-foreground">
                Choose a plan area to focus on. Buttons below mirror the mobile view.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-3">
            {planFilterOptions.map((option) => {
              const Icon = option.icon;
              const isActive = activeTab === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleWorkspaceNavigate(option.value, { autoScroll: false })}
                  className={`group flex min-w-[160px] flex-col gap-1 rounded-2xl border px-3 py-2 text-left transition-colors ${
                    isActive
                      ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                      : 'border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                  aria-pressed={isActive}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="rounded-full bg-primary/10 p-1.5 text-primary group-hover:bg-primary/20">
                      <Icon className="h-4 w-4" />
                    </span>
                    {option.label}
                  </div>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                  <p className="text-[11px] text-muted-foreground/80">{option.helper}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <section ref={tabsSectionRef} className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Detailed workspaces</h2>
          <p className="text-sm text-muted-foreground">
            Switch tabs to add, edit, or complete items across your plans.
          </p>
        </div>
          <Tabs value={activeTab} onValueChange={handleTabValueChange} className="space-y-4">
          <TabsList className="flex w-full gap-2 overflow-x-auto rounded-2xl bg-muted/40 p-1 md:grid md:grid-cols-3 md:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {planFilterOptions.map((option) => (
              <TabsTrigger
                  key={option.value}
                  value={option.value}
                className="min-w-[150px] flex h-auto flex-col items-start gap-1 rounded-xl px-3 py-2 text-left text-sm font-medium leading-tight text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow md:min-w-0"
              >
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">{tabSummaries[option.value]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent
            value="goals"
            className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card p-2 shadow-sm transition-shadow dark:border-border/40 dark:bg-background/80 sm:p-4 ${
              highlightedTab === 'goals' ? 'ring-2 ring-primary/60 shadow-lg' : ''
            }`}
          >
            <AnimatePresence>
              {highlightedTab === 'goals' && (
                <motion.span
                  key="goals-highlight"
                  className="pointer-events-none absolute inset-0 rounded-[14px] border-2 border-primary/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              )}
            </AnimatePresence>
            <div className="relative z-10">
              <GoalsPageClient
                initialGoals={goals}
                userId={userId}
                layoutVariant="embedded"
                onGoalsChange={handleGoalsChange}
              />
            </div>
        </TabsContent>
          <TabsContent
            value="deadlines"
            className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card p-2 shadow-sm transition-shadow dark:border-border/40 dark:bg-background/80 sm:p-4 ${
              highlightedTab === 'deadlines' ? 'ring-2 ring-primary/60 shadow-lg' : ''
            }`}
          >
            <AnimatePresence>
              {highlightedTab === 'deadlines' && (
                <motion.span
                  key="deadlines-highlight"
                  className="pointer-events-none absolute inset-0 rounded-[14px] border-2 border-primary/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              )}
            </AnimatePresence>
            <div className="relative z-10">
              <DeadlinesPageClient initialDeadlines={bootstrap.deadlines} userId={userId} layoutVariant="embedded" />
            </div>
        </TabsContent>
          <TabsContent
            value="wishlist"
            className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card p-2 shadow-sm transition-shadow dark:border-border/40 dark:bg-background/80 sm:p-4 ${
              highlightedTab === 'wishlist' ? 'ring-2 ring-primary/60 shadow-lg' : ''
            }`}
          >
            <AnimatePresence>
              {highlightedTab === 'wishlist' && (
                <motion.span
                  key="wishlist-highlight"
                  className="pointer-events-none absolute inset-0 rounded-[14px] border-2 border-primary/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              )}
            </AnimatePresence>
            <div className="relative z-10">
              <WishlistPageClient initialWishlist={bootstrap.wishlist} userId={userId} layoutVariant="embedded" />
            </div>
        </TabsContent>
      </Tabs>
      </section>
      </div>

      <MobileWorkspaceSheet
        open={mobileWorkspace !== null}
        activeWorkspace={mobileWorkspace}
        planFilterOptions={planFilterOptions}
        tabSummaries={tabSummaries}
        onOpenChange={(open) => {
          if (!open) {
            closeMobileWorkspace();
          } else if (!mobileWorkspace) {
            openMobileWorkspace(activeTab);
          }
        }}
        onWorkspaceSelect={openMobileWorkspace}
        renderContent={renderWorkspaceContent}
      />
    </div>
  );
}

function isTabKey(value: string): value is TabKey {
  return TAB_VALUES.includes(value as TabKey);
}

interface ReminderRowProps {
  icon: IconComponent;
  label: string;
  primary: string;
  secondary: string;
  actionLabel: string;
  onAction: () => void;
}

function ReminderRow({ icon: Icon, label, primary, secondary, actionLabel, onAction }: ReminderRowProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 shadow-sm dark:border-border/40 dark:bg-muted/10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span className="rounded-full bg-primary/10 p-2 text-primary dark:bg-primary/20">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-sm font-medium text-foreground break-words">{primary}</p>
            <p className="text-xs text-muted-foreground break-words">{secondary}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="-mx-2 inline-flex items-center gap-1 self-start rounded-full px-3 text-sm font-medium text-primary sm:self-auto"
          onClick={onAction}
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface HeroStatProps {
  icon: IconComponent;
  label: string;
  primary: string;
  secondary: string;
}

function HeroStat({ icon: Icon, label, primary, secondary }: HeroStatProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/90 p-3 shadow-sm dark:border-border/40 dark:bg-background/60">
      <div className="rounded-full bg-primary/10 p-2 text-primary dark:bg-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-base font-semibold leading-tight text-foreground">{primary}</p>
        <p className="text-xs text-muted-foreground">{secondary}</p>
      </div>
    </div>
  );
}

function goalsEqual(a: Goal[], b: Goal[]) {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  const byId = new Map<string, Goal>();
  for (const goal of a) {
    byId.set(goal.id, goal);
  }
  for (const goal of b) {
    const existing = byId.get(goal.id);
    if (!existing) {
      return false;
    }
    if (
      existing.targetAmount !== goal.targetAmount ||
      existing.currentAmount !== goal.currentAmount ||
      (existing.status ?? 'ACTIVE') !== (goal.status ?? 'ACTIVE') ||
      existing.updatedAt !== goal.updatedAt
    ) {
      return false;
    }
  }
  return true;
}
