'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowRight,
  Search,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { ChartContainer } from '@/components/ui/chart-container';
import { Skeleton } from '@/components/ui/skeleton';
import type { InvestmentsOverview } from '@/lib/investments-overview-service';
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
  'var(--chart-4, #a855f7)',
  'var(--chart-5, #ef4444)',
  'var(--muted)',
];

interface InvestmentsOverviewPanelProps {
  overview: InvestmentsOverview | null;
  loading: boolean;
  fmt: (n: number) => string;
  onOpenResearch: () => void;
  onOpenCas: () => void;
}

export function InvestmentsOverviewPanel({
  overview,
  loading,
  fmt,
  onOpenResearch,
  onOpenCas,
}: InvestmentsOverviewPanelProps) {
  const isMobile = useIsMobile('lg');
  const axisTickMuted = 'var(--muted)';

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl bg-surface" />
          ))}
        </div>
        <Skeleton className="h-[220px] rounded-2xl bg-surface" />
        <Skeleton className="h-[180px] rounded-2xl bg-surface" />
      </div>
    );
  }

  if (!overview) return null;

  const { summary, activity, hasData } = overview;
  const monthlyTrend = overview.monthlyTrend ?? [];
  const bankActivity = activity.filter((a) => a.source === 'bank_txn');
  const topDestinations = bankActivity.slice(0, isMobile ? 5 : 8);
  const maxDest = Math.max(...topDestinations.map((d) => d.totalAmount), 1);
  const chartH = isMobile ? 180 : 220;
  const monthsWithInvest = monthlyTrend.filter((m) => m.amount > 0).length;
  const peakMonth = monthlyTrend.reduce(
    (best, m) => (m.amount > best.amount ? m : best),
    monthlyTrend[0] ?? { label: '—', amount: 0, count: 0, monthKey: '' },
  );

  const kpiCards = [
    {
      title: 'Invested YTD',
      value: fmt(summary.investedThisYear),
      sub: 'This calendar year',
    },
    {
      title: 'Avg / month',
      value: fmt(summary.avgMonthlySip),
      sub: monthsWithInvest > 0 ? `${monthsWithInvest} active mo` : 'Last 12 months',
    },
    {
      title: 'Payments',
      value: String(summary.investmentTransactionCount),
      sub: summary.lastInvestmentDate
        ? `Last ${format(new Date(summary.lastInvestmentDate), 'd MMM')}`
        : 'Last 12 months',
    },
    {
      title: 'Manual assets',
      value: fmt(summary.manualInvestmentAssets),
      sub: 'From net worth',
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      {hasData ? (
        <div
          className={cn(
            'rounded-2xl border p-3 sm:p-4',
            summary.avgMonthlySip > 0
              ? 'border-[var(--success)]/35 bg-[var(--success)]/10'
              : 'border-border/70 bg-card/60',
          )}
        >
          <p className="text-sm font-semibold leading-snug text-foreground">
            {summary.avgMonthlySip > 0 ? (
              <>
                About{' '}
                <span className="text-[var(--success)]">{fmt(summary.avgMonthlySip)}</span> /mo looks
                like broker / SIP payments from your statements
              </>
            ) : (
              <>Broker or SIP narrations found — review destinations below</>
            )}
          </p>
          <p className="mt-1.5 max-w-[62ch] text-xs leading-5 text-foreground/70">
            {peakMonth.amount > 0
              ? `Peak month ${peakMonth.label} at ${fmt(peakMonth.amount)}. YTD ${fmt(summary.investedThisYear)} across ${summary.investmentTransactionCount} matched payments.`
              : 'Only clear broker narrations and tagged investments count here.'}
          </p>
        </div>
      ) : (
        <Callout variant="neutral" title="No investments found in your statements">
          <p className="text-sm text-muted">
            We only count clear broker / SIP narrations (Zerodha, Groww, CAMS, etc.), transactions tagged
            Investment, or assets you add under Net worth. Upload a CAS if you hold mutual funds.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button variant="ghost" size="sm" className="h-8 bg-surface px-2.5" asChild>
              <Link href="/transactions">Import statements</Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 bg-surface px-2.5" onClick={onOpenCas}>
              Upload CAS
            </Button>
            <Button variant="ghost" size="sm" className="h-8 bg-surface px-2.5" onClick={onOpenResearch}>
              Fund research
            </Button>
          </div>
        </Callout>
      )}

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.title} className="min-w-0 rounded-xl border border-border/70 bg-card/80 p-2.5 sm:p-3">
            <p className="truncate text-[10px] uppercase tracking-[0.08em] text-muted">{card.title}</p>
            <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground sm:text-lg">
              {card.value}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted">{card.sub}</p>
          </div>
        ))}
      </div>

      {hasData ? (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-3 sm:p-4">
            <div className="mb-3 space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Monthly investing</h2>
              <p className="text-xs leading-5 text-foreground/65">Clear broker / SIP narrations · last 12 months</p>
            </div>
            <ChartContainer height={chartH}>
              <AreaChart data={monthlyTrend} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.35} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: isMobile ? 9 : 10, fill: axisTickMuted }}
                  axisLine={false}
                  tickLine={false}
                  interval={isMobile ? 2 : 1}
                  minTickGap={18}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: axisTickMuted }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [fmt(Number(v) || 0), 'Invested']}
                  labelFormatter={(label) => String(label)}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: 'var(--muted)' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Invested"
                  stroke="var(--foreground)"
                  fill="var(--foreground)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </section>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-3 sm:p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="size-4 text-muted" />
                  Where money went
                </h2>
                <p className="text-xs leading-5 text-foreground/65">
                  Top destinations from bank activity
                  {summary.lastInvestmentDate
                    ? ` · last ${format(new Date(summary.lastInvestmentDate), 'd MMM yyyy')}`
                    : ''}
                </p>
              </div>
            </div>

            {topDestinations.length > 0 ? (
              isMobile ? (
                <div className="space-y-2.5">
                  {topDestinations.map((row, idx) => (
                    <div key={`${row.label}-${row.source}`} className="min-w-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium text-foreground">{row.label}</p>
                        <p className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                          {fmt(row.totalAmount)}
                        </p>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(6, (row.totalAmount / maxDest) * 100)}%`,
                            background: BAR_COLORS[idx % BAR_COLORS.length],
                          }}
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {row.transactionCount}× · {format(new Date(row.lastDate), 'd MMM')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <ChartContainer height={chartH}>
                  <BarChart
                    data={topDestinations.map((d) => ({
                      ...d,
                      name: d.label.length > 16 ? `${d.label.slice(0, 14)}…` : d.label,
                      fullName: d.label,
                    }))}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.35} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: axisTickMuted }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={96}
                      tick={{ fontSize: 10, fill: axisTickMuted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      labelFormatter={(_, items) => (items?.[0]?.payload as { fullName?: string })?.fullName ?? ''}
                      formatter={(v: number) => [fmt(Number(v) || 0), 'Total']}
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: 'var(--muted)' }}
                      itemStyle={{ color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="totalAmount" radius={[0, 3, 3, 0]} maxBarSize={14}>
                      {topDestinations.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )
            ) : (
              <p className="py-8 text-center text-sm text-muted">No bank destinations yet.</p>
            )}
          </section>
        </div>
      ) : null}

      {hasData && activity.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
          <div className="border-b border-border/60 px-3 py-2.5 sm:px-4">
            <h2 className="text-sm font-semibold text-foreground">All destinations</h2>
            <p className="text-xs text-foreground/65">Tap through to matching transactions</p>
          </div>
          <ul className="divide-y divide-border/60">
            {activity.slice(0, 12).map((row) => (
              <li
                key={`${row.label}-${row.source}`}
                className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{row.label}</p>
                  <p className="text-[11px] text-muted">
                    {row.transactionCount}×
                    {row.source === 'manual_asset' ? ' · manual' : ' · bank'}
                    {' · '}
                    {format(new Date(row.lastDate), 'd MMM yyyy')}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-foreground">{fmt(row.totalAmount)}</p>
                  {row.source === 'bank_txn' ? (
                    <Button variant="ghost" size="sm" className="h-7 px-1.5 text-[11px]" asChild>
                      <Link href={`/transactions?search=${encodeURIComponent(row.label.slice(0, 30))}`}>
                        View
                        <ArrowRight className="ml-0.5 size-3" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onOpenResearch}
          className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          <Search className="size-3.5" />
          Fund research
        </button>
        <Link
          href="/net-worth"
          className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          <Wallet className="size-3.5" />
          Assets & debt
        </Link>
        <Link
          href="/financial-health"
          className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          Tax hints (80C)
        </Link>
        <Link
          href="/analytics"
          className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          Full analytics
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
