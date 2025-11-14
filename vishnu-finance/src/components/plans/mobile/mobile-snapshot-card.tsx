"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DeadlineStatsSummary,
  GoalStatsSummary,
  WishlistStatsSummary,
} from "@/hooks/use-plans-insights";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/hooks/use-plans-insights";

interface MobileSnapshotCardProps {
  goalStats: GoalStatsSummary;
  deadlineStats: DeadlineStatsSummary;
  wishlistStats: WishlistStatsSummary;
  updatedLabel: string;
}

export function MobileSnapshotCard({
  goalStats,
  deadlineStats,
  wishlistStats,
  updatedLabel,
}: MobileSnapshotCardProps) {
  return (
    <Card className="border border-border/60 bg-card/95 shadow-sm backdrop-blur-sm dark:border-border/40 dark:bg-background/80">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Plans snapshot</span>
          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-semibold">
            Updated {updatedLabel}
          </Badge>
        </div>
        <CardTitle className="text-lg font-semibold text-foreground">Stay on track</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {goalStats.target > 0
            ? `${formatCurrency(goalStats.invested)} of ${formatCurrency(goalStats.target)} invested.`
            : `${formatCurrency(goalStats.invested)} invested so far.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-background/90 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Overall progress</span>
            <span>{goalStats.progressPercent}%</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, goalStats.progressPercent))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {goalStats.progressPercent >= 100
              ? "All targets have been reached — brilliant!"
              : "You are steadily investing towards your targets."}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <SnapshotStat
            label="Active goals"
            value={goalStats.active.toString()}
            helper={`${goalStats.completed} done`}
          />
          <SnapshotStat
            label="Upcoming dues"
            value={deadlineStats.upcoming.toString()}
            helper={`${deadlineStats.overdue} overdue`}
          />
          <SnapshotStat
            label="Wishlist"
            value={wishlistStats.pending.toString()}
            helper={`${wishlistStats.completed} done`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface SnapshotStatProps {
  label: string;
  value: string;
  helper: string;
}

function SnapshotStat({ label, value, helper }: SnapshotStatProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 p-3 text-center shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{helper}</p>
    </div>
  );
}

