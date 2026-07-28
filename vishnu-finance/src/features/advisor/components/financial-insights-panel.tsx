'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
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
import { cn, formatCompactRupees, formatRupees } from '@/lib/utils';
import type { AdvisorInsightsPayload } from '@/lib/dashboard-insights';
import { useIsMobile } from '@/hooks/use-breakpoint';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--foreground)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
};

function disciplineShell(status?: string) {
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

interface FinancialInsightsPanelProps {
  insights: AdvisorInsightsPayload;
  className?: string;
  onPromptSelect?: (prompt: string) => void;
  onRegisterRefresh?: (refetch: () => Promise<void>) => void;
}

export function FinancialInsightsPanel({
  insights: initialInsights,
  className,
  onPromptSelect,
  onRegisterRefresh,
}: FinancialInsightsPanelProps) {
  const isMobile = useIsMobile('lg');
  const [data, setData] = useState<AdvisorInsightsPayload>(initialInsights);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setData(initialInsights);
  }, [initialInsights]);

  const loadInsights = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/advisor/insights');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Failed to load advisor insights', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    onRegisterRefresh?.(loadInsights);
  }, [onRegisterRefresh, loadInsights]);

  if (refreshing && !data) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="size-5 animate-spin text-muted" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn('p-6 text-center text-xs text-muted', className)}>
        Unable to load financial insights.
      </div>
    );
  }

  const { spendingContext, segmentSplit, adherence, disciplineSummary } = data;
  const overCount = data.overBudgetBuckets.length;
  const score = Math.round(adherence.overallScore);
  const trendRows = (data.monthlyTrends ?? []).map((t) => ({
    label: t.month?.slice(0, 3) ?? '—',
    amount: Math.round(Number(t.expenses) || 0),
  }));

  const kpiCards = [
    {
      title: 'Plan score',
      value: `${score}%`,
      sub: adherence.monthLabel || 'This month',
      tone: score >= 80 ? 'success' : score >= 60 ? 'default' : 'danger',
    },
    {
      title: 'Spent of plan',
      value: `${Math.round(spendingContext.spentOfPlanPercent)}%`,
      sub: `${formatCompactRupees(adherence.actualTotal)} of ${formatCompactRupees(adherence.plannedTotal)}`,
      tone: spendingContext.spentOfPlanPercent > 100 ? 'danger' : 'default',
    },
    {
      title: 'Avg daily',
      value: formatCompactRupees(spendingContext.avgDailySpend),
      sub: `${spendingContext.daysLeftInMonth}d left · burn ${formatCompactRupees(spendingContext.planDailyBurn)}`,
      tone: 'default',
    },
    {
      title: overCount > 0 ? 'Over budget' : 'Discipline',
      value: overCount > 0 ? String(overCount) : (disciplineSummary?.status ?? 'ok'),
      sub: overCount > 0 ? 'Buckets over plan' : 'Goals & dues capacity',
      tone:
        overCount > 0 || disciplineSummary?.status === 'overcommitted'
          ? 'danger'
          : disciplineSummary?.status === 'tight'
            ? 'warning'
            : 'success',
    },
  ] as const;

  const statusHeadline = () => {
    if (overCount > 0) {
      return (
        <>
          <span className="text-[var(--danger)]">{overCount}</span> budget bucket
          {overCount === 1 ? '' : 's'} over plan this month
        </>
      );
    }
    if (disciplineSummary?.status === 'overcommitted') {
      return <>Commitments are ahead of fundable capacity</>;
    }
    if (disciplineSummary?.status === 'tight') {
      return <>Funding room is tight after goals and dues</>;
    }
    if (score >= 80) {
      return (
        <>
          Plan adherence looks solid at{' '}
          <span className="text-[var(--success)]">{score}%</span>
        </>
      );
    }
    return <>Here&apos;s your month pulse — dig in or ask AI</>;
  };

  return (
    <div className={cn('space-y-3 sm:space-y-4', className)}>
      {refreshing ? (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" />
          Refreshing insights…
        </div>
      ) : null}

      <div
        className={cn(
          'rounded-2xl border p-3 sm:p-4',
          disciplineShell(
            overCount > 0 ? 'overcommitted' : disciplineSummary?.status,
          ),
        )}
      >
        <p className="text-sm font-semibold leading-snug text-foreground">{statusHeadline()}</p>
        <p className="mt-1.5 max-w-[62ch] text-xs leading-5 text-foreground/70">
          Needs {Math.round(segmentSplit.needsPct)}% · wants {Math.round(segmentSplit.wantsPct)}% ·
          savings {Math.round(segmentSplit.savingsPct)}% of tracked spend.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <div
            key={card.title}
            className="min-w-0 rounded-xl border border-border/70 bg-card/80 p-2.5 sm:p-3"
          >
            <p className="truncate text-[10px] uppercase tracking-[0.08em] text-muted">{card.title}</p>
            <p
              className={cn(
                'mt-0.5 truncate text-sm font-semibold capitalize tabular-nums sm:mt-1 sm:text-lg',
                card.tone === 'danger'
                  ? 'text-[var(--danger)]'
                  : card.tone === 'success'
                    ? 'text-[var(--success)]'
                    : card.tone === 'warning'
                      ? 'text-[var(--warning)]'
                      : 'text-foreground',
              )}
            >
              {card.value}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted">{card.sub}</p>
          </div>
        ))}
      </div>

      {trendRows.length > 1 ? (
        <section className="rounded-2xl border border-border/70 bg-card/70 p-3 sm:p-4">
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-foreground">Recent spending</h2>
            <p className="text-xs leading-5 text-foreground/65">Last {trendRows.length} months</p>
          </div>
          <ChartContainer height={isMobile ? 150 : 180} className="w-full">
            <BarChart data={trendRows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v) =>
                  Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [formatRupees(Number(value) || 0), 'Spent']}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={36} fill="var(--chart-1, #0ea5e9)">
                {trendRows.map((row) => (
                  <Cell key={row.label} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>
      ) : null}

      {data.dynamicInsights.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
          <div className="border-b border-border/50 px-3 py-2.5 sm:px-4">
            <h2 className="text-sm font-semibold text-foreground">Key insights</h2>
            <p className="text-xs text-foreground/65">Patterns from this month&apos;s activity</p>
          </div>
          <ul className="divide-y divide-border/60">
            {data.dynamicInsights.map((insight) => (
              <li key={insight.message} className="px-3 py-2.5 sm:px-4">
                <p
                  className={cn(
                    'text-xs leading-relaxed sm:text-sm',
                    insight.type === 'warning' && 'text-[var(--warning)]',
                    insight.type === 'positive' && 'text-[var(--success)]',
                    insight.type === 'pattern' && 'text-foreground/80',
                  )}
                >
                  {insight.message}
                </p>
              </li>
            ))}
          </ul>
          {onPromptSelect && data.overBudgetBuckets[0] ? (
            <div className="border-t border-border/50 px-3 py-2 sm:px-4">
              <button
                type="button"
                className="text-left text-[11px] font-medium text-info underline-offset-2 hover:underline"
                onClick={() =>
                  onPromptSelect(`Why is ${data.overBudgetBuckets[0].label} over budget?`)
                }
              >
                Ask AI about {data.overBudgetBuckets[0].label} →
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <Callout variant="neutral" title="No insights yet">
          <p className="text-sm text-muted">
            Import more transactions or set a budget on Dashboard to unlock pattern callouts.
          </p>
        </Callout>
      )}

      {data.topCategories.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
          <div className="border-b border-border/50 px-3 py-2.5 sm:px-4">
            <h2 className="text-sm font-semibold text-foreground">Top categories</h2>
            <p className="text-xs text-foreground/65">Where spend concentrated</p>
          </div>
          <ul className="divide-y divide-border/60">
            {data.topCategories.slice(0, isMobile ? 4 : 6).map((cat) => (
              <li key={cat.name}>
                <Link
                  href={cat.href}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-surface/60 sm:px-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{cat.name}</p>
                    <p className="text-[10px] text-muted">{Math.round(cat.percent)}% of spend</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatCompactRupees(cat.amount)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.overBudgetBuckets.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--danger)]/35 bg-[var(--danger)]/5">
          <div className="border-b border-[var(--danger)]/25 px-3 py-2.5 sm:px-4">
            <h2 className="text-sm font-semibold text-foreground">Over budget</h2>
            <p className="text-xs text-foreground/65">Buckets past this month&apos;s plan</p>
          </div>
          <ul className="divide-y divide-border/50">
            {data.overBudgetBuckets.slice(0, 5).map((b) => (
              <li
                key={b.label}
                className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4"
              >
                <p className="min-w-0 truncate text-sm font-medium text-foreground">{b.label}</p>
                <p className="shrink-0 text-xs tabular-nums text-[var(--danger)]">
                  {formatCompactRupees(b.actual)} / {formatCompactRupees(b.planned)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.unstartedLines.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
          <div className="border-b border-border/50 px-3 py-2.5 sm:px-4">
            <h2 className="text-sm font-semibold text-foreground">Unstarted plan lines</h2>
            <p className="text-xs text-foreground/65">Budgeted but no spend yet</p>
          </div>
          <ul className="divide-y divide-border/60">
            {data.unstartedLines.slice(0, 5).map((line) => (
              <li key={line.label}>
                <Link
                  href={`/transactions?lineItem=${encodeURIComponent(line.label)}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-surface/60 sm:px-4"
                >
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">{line.label}</p>
                  <p className="shrink-0 text-xs tabular-nums text-muted">
                    {formatCompactRupees(line.planned)} planned
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
        <div className="border-b border-border/50 px-3 py-2.5 sm:px-4">
          <h2 className="text-sm font-semibold text-foreground">See details on</h2>
        </div>
        <ul className="divide-y divide-border/60 text-sm">
          {[
            { href: '/dashboard', label: 'Dashboard — month pulse & categories' },
            { href: '/plans?tab=deadlines', label: 'Plans — bills, dues & funding gap' },
            { href: '/financial-health', label: 'Health — score & trends' },
            { href: '/analytics', label: 'Analytics — deeper charts' },
            { href: '/transactions', label: 'Transactions — all money movement' },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center justify-between gap-2 px-3 py-2.5 text-foreground transition-colors hover:bg-surface/60 sm:px-4"
              >
                <span className="min-w-0 truncate">{link.label}</span>
                <ArrowRight className="size-3.5 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {onPromptSelect ? (
        <div className="flex flex-wrap gap-1.5">
          {[
            'Analyze my spending this month',
            'Show my savings gap',
            data.disciplineSummary?.status === 'overcommitted'
              ? 'Am I overcommitted on goals and dues?'
              : data.overBudgetBuckets[0]
                ? `Why is ${data.overBudgetBuckets[0].label} over budget?`
                : 'Summarize my financial health',
          ].map((prompt) => (
            <Button
              key={prompt}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 bg-surface px-2.5 text-xs"
              onClick={() => onPromptSelect(prompt)}
            >
              {prompt} →
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
