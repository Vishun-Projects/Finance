'use client';

import Link from 'next/link';
import {
  AlarmClock,
  ArrowRight,
  ShoppingCart,
  Target,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { ChartContainer } from '@/components/ui/chart-container';
import { CompactListRow } from '@/components/ui/compact-list-row';
import { Progress } from '@/components/ui/progress';
import { TakeHomeAnchor } from '@/components/finance/take-home-anchor';
import {
  formatCurrency,
  formatDateLabel,
  type DeadlineStatsSummary,
  type GoalStatsSummary,
  type WishlistStatsSummary,
} from '@/features/plans/hooks/use-plans-insights';
import type { Goal, Deadline } from '@/features/plans/types';
import {
  formatDisciplineCurrency,
  goalPaceLabel,
  type DisciplineSummary,
} from '@/lib/plans-discipline';
import {
  receivedSalarySourceLabel,
  type PlanIncomeContext,
} from '@/lib/plan-income';
import type { CurrentAccountBalance } from '@/lib/account-balance-service';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-breakpoint';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--foreground)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
};

const BAR_COLORS = [
  'var(--chart-1, #0ea5e9)',
  'var(--chart-2, #22c55e)',
  'var(--chart-3, #f59e0b)',
];

function statusShell(status: DisciplineSummary['status']) {
  switch (status) {
    case 'ok':
      return 'border-[var(--success)]/35 bg-[var(--success)]/10';
    case 'tight':
      return 'border-[var(--warning)]/35 bg-[var(--warning)]/10';
    case 'overcommitted':
      return 'border-[var(--danger)]/35 bg-[var(--danger)]/10';
    default:
      return 'border-border/70 bg-card/60';
  }
}

function statusHeadline(summary: DisciplineSummary) {
  const { gap, status, capacity, totalRequiredPerMonth } = summary;
  if (status === 'overcommitted') {
    return (
      <>
        Commitments need{' '}
        <span className="text-[var(--danger)]">{formatDisciplineCurrency(Math.abs(gap))}</span> more /mo
        than fundable capacity
      </>
    );
  }
  if (status === 'tight') {
    return (
      <>
        Only <span className="text-[var(--warning)]">{formatDisciplineCurrency(gap)}</span> left after{' '}
        {formatDisciplineCurrency(totalRequiredPerMonth)} /mo commitments
      </>
    );
  }
  return (
    <>
      <span className="text-[var(--success)]">{formatDisciplineCurrency(gap)}</span> left after
      commitments from {formatDisciplineCurrency(capacity.available)} fundable
    </>
  );
}

interface PlansOverviewPanelProps {
  disciplineSummary: DisciplineSummary | null;
  planIncomeContext?: PlanIncomeContext | null;
  accountBalance?: CurrentAccountBalance | null;
  goalStats: GoalStatsSummary;
  deadlineStats: DeadlineStatsSummary;
  wishlistStats: WishlistStatsSummary;
  activeGoals: Goal[];
  overdueDeadlines: Deadline[];
  upcomingDeadlines: Deadline[];
  onOpenGoals: () => void;
  onOpenBills: () => void;
  onOpenWishlist: () => void;
}

export function PlansOverviewPanel({
  disciplineSummary,
  planIncomeContext,
  accountBalance,
  goalStats,
  deadlineStats,
  wishlistStats,
  activeGoals,
  overdueDeadlines,
  upcomingDeadlines,
  onOpenGoals,
  onOpenBills,
  onOpenWishlist,
}: PlansOverviewPanelProps) {
  const isMobile = useIsMobile('lg');
  const dueThisMonth = deadlineStats.overdue + deadlineStats.upcoming;
  const hasEntities =
    goalStats.total > 0 || deadlineStats.total > 0 || wishlistStats.total > 0;

  const goalsRequired = disciplineSummary
    ? disciplineSummary.goals.reduce((s, g) => s + (g.monthlyRequired ?? 0), 0)
    : 0;
  const duesRequired = disciplineSummary
    ? disciplineSummary.deadlines.reduce((s, d) => s + (d.requiredThisMonth || 0), 0)
    : 0;
  const wishRequired = disciplineSummary
    ? disciplineSummary.wishlist.reduce((s, w) => s + (w.monthlyRequired ?? 0), 0)
    : 0;

  const allocation = [
    { key: 'Goals', amount: Math.round(goalsRequired) },
    { key: 'Bills', amount: Math.round(duesRequired) },
    { key: 'Wishlist', amount: Math.round(wishRequired) },
  ].filter((row) => row.amount > 0);

  const behindGoals = (disciplineSummary?.goals ?? [])
    .filter((g) => g.paceStatus === 'behind')
    .slice(0, isMobile ? 3 : 5);

  const goalProgressRows = activeGoals
    .map((g) => {
      const pct =
        g.targetAmount > 0
          ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
          : 0;
      const pace = disciplineSummary?.goals.find((d) => d.goalId === g.id);
      return { goal: g, pct, pace };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, isMobile ? 4 : 6);

  const kpiCards = [
    {
      title: 'Due this month',
      value: String(dueThisMonth),
      sub: deadlineStats.overdue > 0 ? `${deadlineStats.overdue} overdue` : 'Bills & dues',
      tone: deadlineStats.overdue > 0 ? ('danger' as const) : ('default' as const),
    },
    {
      title: 'Required / mo',
      value: disciplineSummary
        ? formatDisciplineCurrency(disciplineSummary.totalRequiredPerMonth)
        : '—',
      sub: 'Goals + dues + wishlist',
      tone: 'default' as const,
    },
    {
      title: 'Active goals',
      value: String(goalStats.active),
      sub:
        goalStats.target > 0
          ? `${goalStats.progressPercent}% of ${formatCurrency(goalStats.target)}`
          : 'No targets yet',
      tone: 'default' as const,
    },
    {
      title: disciplineSummary && disciplineSummary.gap < 0 ? 'Shortfall' : 'Fundable',
      value: disciplineSummary
        ? formatDisciplineCurrency(
            disciplineSummary.gap < 0
              ? Math.abs(disciplineSummary.gap)
              : disciplineSummary.capacity.available,
          )
        : accountBalance?.amount != null
          ? formatCurrency(accountBalance.amount)
          : '—',
      sub:
        disciplineSummary && disciplineSummary.gap < 0
          ? 'Over capacity'
          : accountBalance?.amount != null && !disciplineSummary
            ? 'Bank balance'
            : 'From income received',
      tone:
        disciplineSummary && disciplineSummary.gap < 0
          ? ('danger' as const)
          : ('success' as const),
    },
  ];

  if (!hasEntities && !disciplineSummary) {
    return (
      <Callout variant="neutral" title="Nothing planned yet">
        <p className="text-sm text-muted">
          Add a goal, bill, or wishlist item — then this overview tracks pace, dues, and funding room.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button variant="ghost" size="sm" className="h-8 bg-surface px-2.5" onClick={onOpenGoals}>
            Add goal
          </Button>
          <Button variant="ghost" size="sm" className="h-8 bg-surface px-2.5" onClick={onOpenBills}>
            Add bill
          </Button>
          <Button variant="ghost" size="sm" className="h-8 bg-surface px-2.5" onClick={onOpenWishlist}>
            Add wish
          </Button>
        </div>
      </Callout>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {disciplineSummary ? (
        <div className={cn('rounded-2xl border p-3 sm:p-4', statusShell(disciplineSummary.status))}>
          <TakeHomeAnchor
            baseIncome={disciplineSummary.capacity.planBaseIncome}
            source={
              planIncomeContext?.planScale.source ??
              disciplineSummary.capacity.planIncomeSource ??
              'default'
            }
            variant="compact"
            className="mb-2"
            activeSalaryTakeHome={planIncomeContext?.activeSalaryTakeHome}
            currentMonthSalaryReceived={planIncomeContext?.currentMonthSalaryReceived}
            lastMonthSalaryReceived={planIncomeContext?.lastMonthSalaryReceived}
            receivedSalarySource={planIncomeContext?.receivedSalarySource}
          />
          <p className="text-sm font-semibold leading-snug text-foreground">
            {statusHeadline(disciplineSummary)}
          </p>
          <p className="mt-1.5 max-w-[62ch] text-xs leading-5 text-foreground/70">
            {planIncomeContext?.receivedSalaryAnchor != null &&
            planIncomeContext.receivedSalaryAnchor + 500 < disciplineSummary.capacity.planBaseIncome
              ? `Salary credited ${formatDisciplineCurrency(planIncomeContext.receivedSalaryAnchor)}${
                  planIncomeContext.receivedSalarySource &&
                  planIncomeContext.receivedSalarySource !== 'none'
                    ? ` (${receivedSalarySourceLabel(planIncomeContext.receivedSalarySource)})`
                    : ''
                } vs ${formatDisciplineCurrency(disciplineSummary.capacity.planBaseIncome)} plan take-home.`
              : 'Goals, dues, and wishlist compete for the same fundable room after budget spend.'}
          </p>
          <Link
            href="/dashboard"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-info underline-offset-2 hover:underline"
          >
            Edit income budget
            <ArrowRight className="size-3" />
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.title}
            className="min-w-0 rounded-xl border border-border/70 bg-card/80 p-2.5 sm:p-3"
          >
            <p className="truncate text-[10px] uppercase tracking-[0.08em] text-muted">{card.title}</p>
            <p
              className={cn(
                'mt-0.5 truncate text-sm font-semibold tabular-nums sm:mt-1 sm:text-lg',
                card.tone === 'danger'
                  ? 'text-[var(--danger)]'
                  : card.tone === 'success'
                    ? 'text-[var(--success)]'
                    : 'text-foreground',
              )}
            >
              {card.value}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted">{card.sub}</p>
          </div>
        ))}
      </div>

      {allocation.length > 0 ? (
        <section className="rounded-2xl border border-border/70 bg-card/70 p-3 sm:p-4">
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-foreground">Where required money goes</h2>
            <p className="text-xs leading-5 text-foreground/65">
              Monthly set-aside by bucket · goals, bills, wishlist
            </p>
          </div>
          <ChartContainer height={isMobile ? 160 : 190} className="w-full">
            <BarChart data={allocation} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="key"
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) =>
                  Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [
                  formatDisciplineCurrency(Number(value) || 0),
                  'Required / mo',
                ]}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {allocation.map((row, i) => (
                  <Cell key={row.key} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>
      ) : null}

      {goalProgressRows.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
          <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5 sm:px-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Goal progress</h2>
              <p className="text-xs text-foreground/65">
                {goalStats.progressPercent}% overall · {formatCurrency(goalStats.invested)} saved
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onOpenGoals}>
              All goals
            </Button>
          </div>
          <ul className="divide-y divide-border/60">
            {goalProgressRows.map(({ goal, pct, pace }) => (
              <li key={goal.id} className="px-3 py-2.5 sm:px-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">{goal.title}</p>
                  <p className="shrink-0 text-xs tabular-nums text-muted">{pct}%</p>
                </div>
                <Progress value={pct} className="h-1.5" />
                <p className="mt-1 text-[10px] text-muted">
                  {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                  {pace?.monthlyRequired != null
                    ? ` · ${formatDisciplineCurrency(pace.monthlyRequired)}/mo`
                    : ''}
                  {pace ? ` · ${goalPaceLabel(pace.paceStatus)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {behindGoals.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--warning)]/35 bg-[var(--warning)]/5">
          <div className="border-b border-[var(--warning)]/25 px-3 py-2.5 sm:px-4">
            <h2 className="text-sm font-semibold text-foreground">Behind pace</h2>
            <p className="text-xs text-foreground/65">Needs a higher monthly set-aside to hit the date</p>
          </div>
          <ul className="divide-y divide-border/50">
            {behindGoals.map((g) => (
              <li key={g.goalId}>
                <CompactListRow
                  icon={<Target className="size-4 text-[var(--warning)]" />}
                  title={g.title}
                  subtitle={
                    g.monthlyRequired != null
                      ? `${formatDisciplineCurrency(g.monthlyRequired)}/mo · ${formatDisciplineCurrency(g.remaining)} left`
                      : `${formatDisciplineCurrency(g.remaining)} left`
                  }
                  onClick={onOpenGoals}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(overdueDeadlines.length > 0 ||
        upcomingDeadlines.length > 0 ||
        activeGoals.length > 0 ||
        wishlistStats.pending > 0) && (
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
          <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5 sm:px-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Next up</h2>
              <p className="text-xs text-foreground/65">Soonest dues and focus goal</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onOpenBills}>
                Bills
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onOpenGoals}>
                Goals
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {overdueDeadlines.slice(0, 2).map((d) => (
              <CompactListRow
                key={d.id}
                icon={<AlarmClock className="size-4 text-[var(--danger)]" />}
                title={d.title}
                subtitle="Overdue"
                trailing={formatCurrency(d.amount)}
                onClick={onOpenBills}
              />
            ))}
            {overdueDeadlines.length === 0 &&
              upcomingDeadlines.slice(0, 2).map((d) => (
                <CompactListRow
                  key={d.id}
                  icon={<AlarmClock className="size-4 text-muted" />}
                  title={d.title}
                  subtitle={formatDateLabel(d.dueDate)}
                  trailing={formatCurrency(d.amount)}
                  onClick={onOpenBills}
                />
              ))}
            {activeGoals[0] && (
              <CompactListRow
                icon={<Target className="size-4 text-muted" />}
                title={activeGoals[0].title}
                subtitle={`${Math.min(
                  100,
                  Math.round(
                    (activeGoals[0].currentAmount / (activeGoals[0].targetAmount || 1)) * 100,
                  ),
                )}% saved`}
                onClick={onOpenGoals}
              />
            )}
            {wishlistStats.pending > 0 && (
              <CompactListRow
                icon={<ShoppingCart className="size-4 text-muted" />}
                title={`${wishlistStats.pending} wishlist item${wishlistStats.pending === 1 ? '' : 's'}`}
                subtitle={formatCurrency(wishlistStats.totalCost)}
                onClick={onOpenWishlist}
              />
            )}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Button variant="ghost" size="sm" className="h-8 bg-surface px-2.5" onClick={onOpenGoals}>
          Goals
        </Button>
        <Button variant="ghost" size="sm" className="h-8 bg-surface px-2.5" onClick={onOpenBills}>
          Bills & dues
        </Button>
        <Button variant="ghost" size="sm" className="h-8 bg-surface px-2.5" onClick={onOpenWishlist}>
          Wishlist
        </Button>
        <Button variant="ghost" size="sm" className="h-8 bg-surface px-2.5" asChild>
          <Link href="/phase-plan">Phase plan</Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 bg-surface px-2.5" asChild>
          <Link href="/analytics">Analytics</Link>
        </Button>
      </div>
    </div>
  );
}
