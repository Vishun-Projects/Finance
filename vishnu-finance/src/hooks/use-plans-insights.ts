"use client";

import { useMemo } from "react";
import type { Goal } from "@/types/goals";
import type { Deadline, DeadlinesResponse } from "@/types/deadlines";
import type { WishlistItem, WishlistResponse } from "@/types/wishlist";
import {
  CalendarDays,
  ClipboardCheck,
  HeartHandshake,
} from "lucide-react";

export type TabKey = "goals" | "deadlines" | "wishlist";

export interface GoalStatsSummary {
  total: number;
  completed: number;
  active: number;
  invested: number;
  target: number;
  progressPercent: number;
}

export interface DeadlineStatsSummary {
  total: number;
  paid: number;
  upcoming: number;
  overdue: number;
}

export interface WishlistStatsSummary {
  total: number;
  completed: number;
  pending: number;
  totalCost: number;
}

export interface PlanFilterOption {
  value: TabKey;
  label: string;
  description: string;
  helper: string;
  icon: typeof ClipboardCheck;
}

export interface MobileWorkspaceCardData {
  value: TabKey;
  title: string;
  icon: typeof ClipboardCheck;
  ctaLabel: string;
  metrics: Array<{ label: string; value: string; helper?: string }>;
  highlight: { title: string; description: string };
}

interface UsePlansInsightsInput {
  goals: Goal[];
  deadlines: DeadlinesResponse;
  wishlist: WishlistResponse;
}

export function usePlansInsights({
  goals,
  deadlines,
  wishlist,
}: UsePlansInsightsInput) {
  const goalStats = useMemo<GoalStatsSummary>(() => {
    const total = goals.length;
    const completed = goals.filter((goal) => goal.status === "COMPLETED").length;
    const active = goals.filter((goal) => goal.status !== "COMPLETED").length;
    const invested = goals.reduce(
      (sum, goal) => sum + (goal.currentAmount ?? 0),
      0,
    );
    const target = goals.reduce(
      (sum, goal) => sum + (goal.targetAmount ?? 0),
      0,
    );
    const progressPercent = target
      ? Math.min(Math.round((invested / target) * 100), 100)
      : 0;
    return { total, completed, active, invested, target, progressPercent };
  }, [goals]);

  const deadlineEntries = useMemo(() => deadlines.data ?? [], [deadlines.data]);

  const deadlineStats = useMemo<DeadlineStatsSummary>(() => {
    const total = deadlineEntries.length;
    const paid = deadlineEntries.filter((deadline) => deadline.isCompleted).length;
    const today = new Date();
    const upcoming = deadlineEntries.filter(
      (deadline) =>
        !deadline.isCompleted && new Date(deadline.dueDate) >= today,
    ).length;
    const overdue = deadlineEntries.filter(
      (deadline) =>
        !deadline.isCompleted && new Date(deadline.dueDate) < today,
    ).length;
    return { total, paid, upcoming, overdue };
  }, [deadlineEntries]);

  const wishlistItems = useMemo(() => wishlist.data ?? [], [wishlist.data]);

  const wishlistStats = useMemo<WishlistStatsSummary>(() => {
    const total = wishlistItems.length;
    const completed = wishlistItems.filter((item) => item.isCompleted).length;
    const pending = total - completed;
    const totalCost = wishlistItems.reduce(
      (sum, item) => sum + (item.estimatedCost ?? 0),
      0,
    );
    return { total, completed, pending, totalCost };
  }, [wishlistItems]);

  const highlightedGoal = useMemo<Goal | null>(() => {
    const activeGoals = goals.filter((goal) => goal.status !== "COMPLETED");
    if (activeGoals.length === 0) return null;
    return [...activeGoals].sort((a, b) => {
      const priorityDifference = priorityRank(b.priority) - priorityRank(a.priority);
      if (priorityDifference !== 0) {
        return priorityDifference;
      }
      const aDate = toComparableDate(a.targetDate);
      const bDate = toComparableDate(b.targetDate);
      if (aDate && bDate) {
        return aDate.getTime() - bDate.getTime();
      }
      if (aDate) return -1;
      if (bDate) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })[0];
  }, [goals]);

  const nextDeadline = useMemo<Deadline | null>(() => {
    const incomplete = deadlineEntries.filter((deadline) => !deadline.isCompleted);
    if (incomplete.length === 0) return null;
    return [...incomplete].sort((a, b) => {
      const aDate = toComparableDate(a.dueDate);
      const bDate = toComparableDate(b.dueDate);
      if (aDate && bDate) {
        return aDate.getTime() - bDate.getTime();
      }
      if (aDate) return -1;
      if (bDate) return 1;
      return 0;
    })[0];
  }, [deadlineEntries]);

  const nextWishlist = useMemo<WishlistItem | null>(() => {
    const pending = wishlistItems.filter((item) => !item.isCompleted);
    if (pending.length === 0) return null;
    return [...pending].sort((a, b) => {
      const priorityDifference = priorityRank(b.priority) - priorityRank(a.priority);
      if (priorityDifference !== 0) {
        return priorityDifference;
      }
      const aDate = toComparableDate(a.targetDate);
      const bDate = toComparableDate(b.targetDate);
      if (aDate && bDate) {
        return aDate.getTime() - bDate.getTime();
      }
      if (aDate) return -1;
      if (bDate) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })[0];
  }, [wishlistItems]);

  const tabSummaries = useMemo<Record<TabKey, string>>(
    () => ({
      goals: `${goalStats.active} active`,
      deadlines: `${deadlineStats.upcoming} upcoming`,
      wishlist: `${wishlistStats.pending} pending`,
    }),
    [deadlineStats.upcoming, goalStats.active, wishlistStats.pending],
  );

  const planFilterOptions = useMemo<PlanFilterOption[]>(
    () => [
      {
        value: "goals",
        label: "Goals",
        description: `${goalStats.active} active`,
        helper: `${goalStats.completed} completed • ${goalStats.total} total`,
        icon: ClipboardCheck,
      },
      {
        value: "deadlines",
        label: "Deadlines",
        description: `${deadlineStats.upcoming} upcoming`,
        helper: `${deadlineStats.overdue} overdue • ${deadlineStats.paid} paid`,
        icon: CalendarDays,
      },
      {
        value: "wishlist",
        label: "Wishlist",
        description: `${wishlistStats.pending} pending`,
        helper: `${wishlistStats.completed} completed • ${wishlistStats.total} total`,
        icon: HeartHandshake,
      },
    ],
    [
      deadlineStats.overdue,
      deadlineStats.paid,
      deadlineStats.upcoming,
      goalStats.active,
      goalStats.completed,
      goalStats.total,
      wishlistStats.completed,
      wishlistStats.pending,
      wishlistStats.total,
    ],
  );

  const mobileWorkspaceCards = useMemo<MobileWorkspaceCardData[]>(
    () => [
      {
        value: "goals",
        title: "Goals workspace",
        icon: ClipboardCheck,
        ctaLabel: "Open goals",
        metrics: [
          {
            label: "Active",
            value: goalStats.active.toString(),
            helper: `${goalStats.completed} completed`,
          },
          {
            label: "Invested",
            value: formatCurrency(goalStats.invested),
            helper: `${goalStats.progressPercent}% progress`,
          },
        ],
        highlight: highlightedGoal
          ? {
            title: highlightedGoal.title,
            description: `${formatCurrency(
              highlightedGoal.currentAmount,
            )} of ${formatCurrency(
              highlightedGoal.targetAmount,
            )} • ${highlightedGoal.targetDate
                ? formatDateLabel(highlightedGoal.targetDate)
                : "No date set"
              }`,
          }
          : {
            title: "No active goals yet",
            description: "Create a goal to start tracking your savings target.",
          },
      },
      {
        value: "deadlines",
        title: "Deadlines workspace",
        icon: CalendarDays,
        ctaLabel: "View deadlines",
        metrics: [
          {
            label: "Upcoming",
            value: deadlineStats.upcoming.toString(),
            helper: `${deadlineStats.overdue} overdue`,
          },
          {
            label: "Paid",
            value: deadlineStats.paid.toString(),
            helper: `${deadlineStats.total} total`,
          },
        ],
        highlight: nextDeadline
          ? {
            title: nextDeadline.title,
            description: buildDeadlineSecondary(nextDeadline),
          }
          : {
            title: "All clear",
            description: "Add a reminder so you never miss an important payment.",
          },
      },
      {
        value: "wishlist",
        title: "Wishlist workspace",
        icon: HeartHandshake,
        ctaLabel: "Review wishlist",
        metrics: [
          {
            label: "Pending",
            value: wishlistStats.pending.toString(),
            helper: `${wishlistStats.completed} completed`,
          },
          {
            label: "Total cost",
            value: formatCurrency(wishlistStats.totalCost),
            helper: nextWishlist
              ? `${formatPriorityLabel(nextWishlist.priority)} priority next`
              : "Plan your next purchase",
          },
        ],
        highlight: nextWishlist
          ? {
            title: nextWishlist.title,
            description: `${formatCurrency(
              nextWishlist.estimatedCost,
            )} • ${formatPriorityLabel(nextWishlist.priority)} priority`,
          }
          : {
            title: "Nothing queued",
            description: "Add something you are planning to invest in next.",
          },
      },
    ],
    [
      deadlineStats.overdue,
      deadlineStats.paid,
      deadlineStats.total,
      deadlineStats.upcoming,
      goalStats.active,
      goalStats.completed,
      goalStats.invested,
      goalStats.progressPercent,
      highlightedGoal,
      nextDeadline,
      nextWishlist,
      wishlistStats.completed,
      wishlistStats.pending,
      wishlistStats.totalCost,
    ],
  );

  return {
    goalStats,
    deadlineStats,
    wishlistStats,
    highlightedGoal,
    nextDeadline,
    nextWishlist,
    tabSummaries,
    planFilterOptions,
    mobileWorkspaceCards,
  };
}

export function formatCurrency(value?: number | null) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateLabel(value?: string | Date | null) {
  const parsed = toComparableDate(value);
  if (!parsed) {
    return "No date set";
  }
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (parsed.getFullYear() !== today.getFullYear()) {
    options.year = "numeric";
  }
  return new Intl.DateTimeFormat("en-IN", options).format(parsed);
}

export function formatPriorityLabel(priority?: WishlistItem["priority"]) {
  if (!priority) {
    return "Medium";
  }
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function buildDeadlineSecondary(deadline: Deadline) {
  const amount =
    typeof deadline.amount === "number" &&
      Number.isFinite(deadline.amount) &&
      deadline.amount > 0
      ? `${formatCurrency(deadline.amount)} • `
      : "";
  const dueLabel = formatDateLabel(deadline.dueDate);
  const overdue = !deadline.isCompleted && isDatePast(deadline.dueDate);
  const statusLabel = overdue ? "Overdue" : "Upcoming";
  return `${amount}Due ${dueLabel}${statusLabel ? ` • ${statusLabel}` : ""}`;
}

function priorityRank(priority?: WishlistItem["priority"]) {
  switch (priority) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
    default:
      return 1;
  }
}

function toComparableDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function isDatePast(value?: string | Date | null) {
  const parsed = toComparableDate(value);
  if (!parsed) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(parsed);
  compare.setHours(0, 0, 0, 0);
  return compare.getTime() < today.getTime();
}

