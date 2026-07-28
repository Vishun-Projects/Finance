'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart-container';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { formatRupees, cn } from '@/lib/utils';
import type { AnalyticsBootstrap, AnalyticsPeriodPreset } from '@/features/analytics/types';
import AnalyticsChartCard from './analytics-chart-card';
import AnalyticsFilterBar from './analytics-filter-bar';
import AnalyticsKpiStrip from './analytics-kpi-strip';
import AnalyticsAnchorNav from './analytics-anchor-nav';
import AnalyticsGoalStatusList from './analytics-goal-status-list';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--foreground)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
};

const tooltipLabelStyle = {
  color: 'var(--muted)',
};

const tooltipItemStyle = {
  color: 'var(--foreground)',
};

const PIE_COLORS = [
  'var(--chart-1, #0ea5e9)',
  'var(--chart-2, #22c55e)',
  'var(--chart-3, #f59e0b)',
  'var(--chart-4, #a855f7)',
  'var(--chart-5, #ef4444)',
  '#64748b',
  '#14b8a6',
  '#e11d48',
  '#8b5cf6',
  '#84cc16',
  '#06b6d4',
  '#f97316',
];

function moneyTooltip(value: number) {
  return formatRupees(value);
}

interface AnalyticsPageProps {
  data: AnalyticsBootstrap;
}

export default function AnalyticsPage({ data }: AnalyticsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [analytics, setAnalytics] = useState<AnalyticsBootstrap>(data);
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState<AnalyticsPeriodPreset>(data.range.preset);
  const [startDate, setStartDate] = useState(data.range.startDate || '');
  const [endDate, setEndDate] = useState(data.range.endDate || '');
  const [activeSection, setActiveSection] = useState('overview');
  const isMobile = useIsMobile('lg');
  const isCompact = useIsMobile('xl');

  const sections = useMemo(
    () => [
      { id: 'overview', label: 'Overview' },
      { id: 'cashflow', label: 'Cashflow' },
      { id: 'categories', label: 'Categories' },
      { id: 'goals', label: 'Goals' },
      { id: 'payees', label: 'Payees' },
    ],
    [],
  );

  useEffect(() => {
    setAnalytics(data);
    setPreset(data.range.preset);
    setStartDate(data.range.startDate || '');
    setEndDate(data.range.endDate || '');
  }, [data]);

  useEffect(() => {
    const onScroll = () => {
      const sticky = document.querySelector('[data-analytics-sticky]') as HTMLElement | null;
      const threshold = (sticky?.offsetHeight ?? 120) + 24;
      const current = sections.findLast((section) => {
        const node = document.getElementById(section.id);
        if (!node) return false;
        return node.getBoundingClientRect().top <= threshold;
      });
      setActiveSection(current?.id || sections[0].id);
    };

    onScroll();
    const scroller = document.querySelector('main[data-scroll-mode]');
    scroller?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      scroller?.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sections]);

  async function refetch(nextPreset: AnalyticsPeriodPreset, nextStart: string, nextEnd: string) {
    const params = new URLSearchParams();
    params.set('preset', nextPreset);
    if (nextPreset === 'custom') {
      if (nextStart) params.set('startDate', nextStart);
      if (nextEnd) params.set('endDate', nextEnd);
    }
    router.replace(`${pathname}?${params.toString()}`);
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const nextData = (await res.json()) as AnalyticsBootstrap;
      setAnalytics(nextData);
      setPreset(nextData.range.preset);
      setStartDate(nextData.range.startDate || '');
      setEndDate(nextData.range.endDate || '');
    } finally {
      setLoading(false);
    }
  }

  const {
    summary,
    months,
    expenseCategories,
    incomeBreakdown,
    salaryHistory,
    goals,
    topPayees,
    weekdaySpend,
    patternInsights,
  } = analytics;

  const incomePie = [
    { name: 'Salary / work', value: incomeBreakdown.salary },
    { name: 'Family', value: incomeBreakdown.family },
    { name: 'Friends', value: incomeBreakdown.friends },
    { name: 'Other', value: incomeBreakdown.other },
  ].filter((d) => d.value > 0);

  const goalChartData = goals.map((g) => ({
    name: g.title.length > 18 ? `${g.title.slice(0, 16)}…` : g.title,
    fullName: g.title,
    progress: g.progressPct,
  }));

  const pace = months.slice(-6);
  const monthlyPace =
    pace.length > 0 ? pace.reduce((s, m) => s + m.savings, 0) / pace.length : summary.avgMonthlySavings;
  const projection = Array.from({ length: 19 }, (_, i) => ({
    label: i === 0 ? 'Now' : `+${i}m`,
    balance: Math.round((summary.bankBalance + monthlyPace * i) * 100) / 100,
  }));
  const flexibleChart = patternInsights.topFlexibleCategories.map((c) => ({
    name: c.name.length > 18 ? `${c.name.slice(0, 16)}…` : c.name,
    fullName: c.name,
    baseline: c.baselineAvg,
    recent: c.recentAvg,
    share: c.shareOfExpense,
    corr: c.incomeSensitivity,
  }));
  const top3Flexible = patternInsights.topFlexibleCategories.slice(0, 3);
  const suggestedCutMonthly = top3Flexible.reduce((s, c) => s + c.recentAvg * 0.2, 0);
  const recentWindow = Math.min(6, months.length);
  const isRecentPaceNegative = monthlyPace < 0;
  const unreachableGoals = goals.filter((g) => !g.reachable).length;

  const chartH = isMobile ? 190 : isCompact ? 220 : 250;
  const chartHTall = isMobile ? 210 : isCompact ? 240 : 270;
  const yAxisWidth = isMobile ? 72 : isCompact ? 96 : 110;
  // Always thin ticks by data density — interval=0 shows every month and overlaps on PC.
  const monthTickInterval = Math.max(
    0,
    Math.ceil(months.length / (isMobile ? 4 : isCompact ? 7 : 10)) - 1,
  );
  const sectionScrollMt = 'scroll-mt-[11rem] sm:scroll-mt-44 lg:scroll-mt-36';
  const axisTickMuted = 'color-mix(in oklab, var(--foreground) 55%, transparent)';
  // Cap extreme savings-rate outliers so one bad month doesn't crush the chart scale.
  const savingsRates = months.map((m) => m.savingsRate);
  const savingsAbsMax = savingsRates.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  const savingsDomain: [number, number] | ['auto', 'auto'] =
    savingsAbsMax > 150 ? [-120, 120] : ['auto', 'auto'];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 pb-8 max-lg:pb-4 sm:space-y-5">
      {/* Title scrolls away — top bar already says Analytics on mobile */}
      <div className="min-w-0">
        <h1 className="hidden text-lg font-semibold text-foreground sm:text-xl lg:block">Analytics</h1>
        <p className="truncate text-[11px] text-muted sm:text-xs">
          {summary.firstDate ?? '—'} → {summary.lastDate ?? '—'} · {summary.txnCount.toLocaleString('en-IN')} txns
          {loading ? ' · refreshing…' : ''}
        </p>
      </div>

      <div
        data-analytics-sticky
        className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-50 -mx-4 isolate space-y-2 bg-background/95 px-4 pb-0 backdrop-blur-md lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none"
      >
        <div className="w-full min-w-0 lg:max-w-xl lg:ml-auto">
          <AnalyticsFilterBar
            preset={preset}
            startDate={startDate}
            endDate={endDate}
            onPresetChange={(nextPreset) => {
              setPreset(nextPreset);
              refetch(nextPreset, startDate, endDate);
            }}
            onCustomRangeChange={(nextStart, nextEnd) => {
              setStartDate(nextStart);
              setEndDate(nextEnd);
              if (preset === 'custom' && nextStart && nextEnd && nextStart <= nextEnd) {
                refetch('custom', nextStart, nextEnd);
              }
            }}
          />
        </div>
        <AnalyticsAnchorNav items={sections} activeId={activeSection} />
      </div>

      {/* ---------- OVERVIEW ---------- */}
      <section id="overview" className={cn(sectionScrollMt, 'space-y-3 sm:space-y-4')}>
        <div
          className={cn(
            'rounded-2xl border p-3 sm:p-4',
            isRecentPaceNegative
              ? 'border-[var(--danger)]/35 bg-[var(--danger)]/10'
              : 'border-[var(--success)]/35 bg-[var(--success)]/10',
          )}
        >
          <p className="text-sm font-semibold leading-snug text-foreground">
            {isRecentPaceNegative ? (
              <>
                You&apos;re spending{' '}
                <span className="text-[var(--danger)]">{formatRupees(Math.abs(monthlyPace))}</span> more than you earn,
                every month
              </>
            ) : (
              <>
                You&apos;re saving about{' '}
                <span className="text-[var(--success)]">{formatRupees(monthlyPace)}</span> per month at current pace
              </>
            )}
          </p>
          <p className="mt-2 max-w-[62ch] text-xs leading-5 text-foreground/70">
            {isRecentPaceNegative
              ? `At this pace ${unreachableGoals || goals.length} of your goals stay hard to reach, and bank balance trends down. Cut flexible spend (~${formatRupees(suggestedCutMonthly)}/mo possible) first.`
              : `Flexible category cuts of ~${formatRupees(suggestedCutMonthly)}/mo can accelerate goals further.`}
          </p>
        </div>

        <AnalyticsKpiStrip data={analytics} recentPace={monthlyPace} />
      </section>

      {/* ---------- CASHFLOW ---------- */}
      <section id="cashflow" className={cn(sectionScrollMt, 'grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2')}>
        <AnalyticsChartCard
          title="Income vs Spend"
          subtitle={`${summary.firstDate ?? '—'} to ${summary.lastDate ?? '—'} · monthly totals`}
        >
          <ChartContainer height={chartH}>
            <ComposedChart data={months} margin={{ top: 8, right: 4, left: 0, bottom: isMobile ? 4 : 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.35} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: isMobile ? 9 : 10, fill: axisTickMuted }}
                axisLine={false}
                tickLine={false}
                interval={monthTickInterval}
                minTickGap={isMobile ? 18 : 28}
              />
              <YAxis
                tick={{ fontSize: 10, fill: axisTickMuted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                width={34}
              />
              <Tooltip
                formatter={(v: number) => moneyTooltip(v)}
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
              />
              {!isMobile ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
              <Bar dataKey="income" name="Income" fill="var(--success, #22c55e)" radius={[3, 3, 0, 0]} maxBarSize={isMobile ? 14 : 22} />
              <Bar dataKey="expenses" name="Spent" fill="var(--danger, #ef4444)" radius={[3, 3, 0, 0]} maxBarSize={isMobile ? 14 : 22} />
              <Line type="monotone" dataKey="savings" name="Net" stroke="var(--foreground)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ChartContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Savings Rate by Month" subtitle="Net ÷ income. Positive = kept money that month">
          <ChartContainer height={chartH}>
            <AreaChart data={months} margin={{ top: 8, right: 4, left: 0, bottom: isMobile ? 4 : 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.35} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: isMobile ? 9 : 10, fill: axisTickMuted }}
                axisLine={false}
                tickLine={false}
                interval={monthTickInterval}
                minTickGap={isMobile ? 18 : 28}
              />
              <YAxis
                tick={{ fontSize: 10, fill: axisTickMuted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v)}%`}
                width={40}
                domain={savingsDomain}
                allowDataOverflow
              />
              <Tooltip
                formatter={(v: number) => `${v}%`}
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
              />
              <Area
                type="monotone"
                dataKey="savingsRate"
                name="Savings %"
                stroke="var(--foreground)"
                fill="var(--foreground)"
                fillOpacity={0.12}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </AnalyticsChartCard>
      </section>

      {/* ---------- CATEGORIES ---------- */}
      <section id="categories" className={cn(sectionScrollMt, 'space-y-3 sm:space-y-4')}>
        <AnalyticsChartCard
          title="Pattern Intelligence"
          subtitle="Algorithmic trend analysis of when and why spend rises"
        >
          <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4 sm:gap-3">
            <div className="rounded-xl border border-border/70 bg-card/60 p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-foreground/55 sm:text-[11px]">Expense growth</p>
              <p className={cn('mt-1 text-base font-semibold sm:text-lg', patternInsights.spendGrowthPct > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]')}>
                {patternInsights.spendGrowthPct > 0 ? '+' : ''}
                {patternInsights.spendGrowthPct}%
              </p>
              <p className="mt-1 text-[11px] leading-4 text-foreground/65 sm:text-xs sm:leading-5">
                {formatRupees(patternInsights.baselineAverageExpense)} → {formatRupees(patternInsights.recentAverageExpense)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/60 p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-foreground/55 sm:text-[11px]">Income growth</p>
              <p className={cn('mt-1 text-base font-semibold sm:text-lg', patternInsights.incomeGrowthPct >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
                {patternInsights.incomeGrowthPct > 0 ? '+' : ''}
                {patternInsights.incomeGrowthPct}%
              </p>
              <p className="mt-1 text-[11px] leading-4 text-foreground/65 sm:text-xs sm:leading-5">same period</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/60 p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-foreground/55 sm:text-[11px]">Spend-income link</p>
              <p className="mt-1 text-base font-semibold text-foreground sm:text-lg">{patternInsights.expenseIncomeCorrelation}</p>
              <p className="mt-1 text-[11px] leading-4 text-foreground/65 sm:text-xs sm:leading-5">1 = move together</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/60 p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-foreground/55 sm:text-[11px]">Flexible share</p>
              <p className="mt-1 text-base font-semibold text-foreground sm:text-lg">{patternInsights.spendConcentrationPct}%</p>
              <p className="mt-1 text-[11px] leading-4 text-foreground/65 sm:text-xs sm:leading-5">top 3 flexible</p>
            </div>
          </div>

          <ChartContainer height={isMobile ? Math.max(220, flexibleChart.slice(0, 6).length * 36) : chartH}>
            {isMobile ? (
              <BarChart
                data={flexibleChart.slice(0, 6)}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.35} />
                <XAxis type="number" tick={{ fontSize: 9, fill: axisTickMuted }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fontSize: 9, fill: axisTickMuted }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(_, items) => (items?.[0]?.payload as { fullName?: string })?.fullName ?? ''}
                  formatter={(v, key) => {
                    const val = Number(v) || 0;
                    if (key === 'baseline') return [moneyTooltip(val), 'Baseline'];
                    if (key === 'recent') return [moneyTooltip(val), 'Recent'];
                    return [moneyTooltip(val), String(key)];
                  }}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Bar dataKey="baseline" name="Baseline" fill="var(--muted)" radius={[0, 3, 3, 0]} maxBarSize={10} />
                <Bar dataKey="recent" name="Recent" fill="var(--chart-1, #0ea5e9)" radius={[0, 3, 3, 0]} maxBarSize={10} />
              </BarChart>
            ) : (
              <ComposedChart data={flexibleChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.35} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: axisTickMuted }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: axisTickMuted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  width={36}
                  yAxisId="amount"
                />
                <Tooltip
                  labelFormatter={(_, items) => (items?.[0]?.payload as { fullName?: string })?.fullName ?? ''}
                  formatter={(v, key) => {
                    const val = Number(v) || 0;
                    if (key === 'baseline') return [moneyTooltip(val), 'Baseline avg / month'];
                    if (key === 'recent') return [moneyTooltip(val), 'Recent avg / month'];
                    return [moneyTooltip(val), String(key)];
                  }}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="baseline" name="Baseline avg" fill="var(--muted)" radius={[3, 3, 0, 0]} maxBarSize={18} yAxisId="amount" />
                <Bar dataKey="recent" name="Recent avg" fill="var(--chart-1, #0ea5e9)" radius={[3, 3, 0, 0]} maxBarSize={18} yAxisId="amount" />
              </ComposedChart>
            )}
          </ChartContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Top places to optimize now" subtitle="Ranked by flexible spend opportunity">
          <div className="overflow-hidden rounded-xl border border-border/70">
            {top3Flexible.map((c, idx) => (
              <div
                key={c.name}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5',
                  idx > 0 ? 'border-t border-border/60' : '',
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold text-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="truncate text-[11px] text-foreground/65">
                    {formatRupees(c.recentAvg)}/mo · {c.shareOfExpense}% share
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] uppercase tracking-[0.06em] text-foreground/55">20% cut</p>
                  <p className="text-sm font-semibold text-[var(--success)]">{formatRupees(c.recentAvg * 0.2)}</p>
                </div>
              </div>
            ))}
          </div>
        </AnalyticsChartCard>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          <AnalyticsChartCard title="Where money goes" subtitle="Top expense categories">
            <ChartContainer height={chartHTall}>
              <BarChart data={expenseCategories.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.35} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis type="category" dataKey="name" width={yAxisWidth} tick={{ fontSize: isMobile ? 9 : 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => moneyTooltip(v)}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Bar dataKey="amount" name="Spent" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {expenseCategories.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </AnalyticsChartCard>

          <AnalyticsChartCard title="Income Mix" subtitle="Salary vs family vs friends vs other">
            <ChartContainer height={chartHTall}>
              <PieChart>
                <Pie
                  data={incomePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 42 : 55}
                  outerRadius={isMobile ? 72 : 90}
                  paddingAngle={2}
                >
                  {incomePie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => moneyTooltip(v)}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ChartContainer>
          </AnalyticsChartCard>
        </div>
      </section>

      {/* ---------- GOALS ---------- */}
      <section id="goals" className={cn(sectionScrollMt, 'space-y-3 sm:space-y-4')}>
        <AnalyticsChartCard
          title="Goal Reachability"
          subtitle={`Based on last ${recentWindow} months' avg net flow (${formatRupees(monthlyPace)}/mo)`}
        >
          {goals.length === 0 ? (
            <p className="text-sm text-muted">No active goals yet — add one under Plans.</p>
          ) : (
            <div className="space-y-4">
              {isRecentPaceNegative ? (
                <div className="rounded-lg border border-[var(--danger)]/35 bg-[var(--danger)]/10 px-3 py-2 text-xs text-muted">
                  Goals below are hard to reach at current pace. Fix the {formatRupees(Math.abs(monthlyPace))}/mo gap and reachability recalculates.
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartContainer height={Math.max(isMobile ? 180 : isCompact ? 200 : 220, goals.length * 44)}>
                  <BarChart data={goalChartData} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.35} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={yAxisWidth} tick={{ fontSize: isMobile ? 9 : 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: number) => [`${Math.round(v)}%`, 'Progress']}
                      labelFormatter={(_, items) => (items?.[0]?.payload as { fullName?: string })?.fullName ?? ''}
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                    />
                    <Bar dataKey="progress" name="Progress" fill="var(--chart-2, #22c55e)" radius={[0, 4, 4, 0]} maxBarSize={16} />
                  </BarChart>
                </ChartContainer>
                <AnalyticsGoalStatusList goals={goals} />
              </div>
            </div>
          )}
        </AnalyticsChartCard>
      </section>

      {/* ---------- PAYEES ---------- */}
      <section id="payees" className={cn(sectionScrollMt, 'grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2')}>
        <AnalyticsChartCard title="Top Payees" subtitle="Derived from person name, store, or parsed bank narration">
          <ChartContainer height={chartHTall}>
            <BarChart data={topPayees.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.35} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <YAxis
                type="category"
                dataKey="name"
                width={yAxisWidth}
                tick={{ fontSize: isMobile ? 9 : 10, fill: 'var(--muted)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => (v.length > (isMobile ? 12 : 16) ? `${v.slice(0, isMobile ? 10 : 14)}…` : v)}
              />
              <Tooltip
                formatter={(v: number, _n, item) => [
                  moneyTooltip(v),
                  `${(item?.payload as { count?: number })?.count ?? 0} txns`,
                ]}
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
              />
              <Bar dataKey="amount" name="Spent" fill="var(--chart-1, #0ea5e9)" radius={[0, 4, 4, 0]} maxBarSize={16} />
            </BarChart>
          </ChartContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Spend by Weekday" subtitle="Pattern of when money leaves">
          <ChartContainer height={chartHTall}>
            <BarChart data={weekdaySpend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.35} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={36} />
              <Tooltip
                formatter={(v: number, _n, item) => [
                  moneyTooltip(v),
                  `${(item?.payload as { count?: number })?.count ?? 0} txns`,
                ]}
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
              />
              <Bar dataKey="amount" name="Spent" fill="var(--chart-3, #f59e0b)" radius={[4, 4, 0, 0]} maxBarSize={isMobile ? 24 : 34} />
            </BarChart>
          </ChartContainer>
        </AnalyticsChartCard>
      </section>

      {/* ---------- SALARY + PROJECTION ---------- */}
      <section className={cn('grid grid-cols-1 gap-3 sm:gap-4', salaryHistory.length >= 1 ? 'md:grid-cols-2' : '')}>
        {salaryHistory.length >= 1 ? (
          <AnalyticsChartCard title="Salary History" subtitle="Base salary over structure revisions">
            <ChartContainer height={isMobile ? 180 : 200}>
              <AreaChart data={salaryHistory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.35} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: axisTickMuted }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 10, fill: axisTickMuted }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={36} />
                <Tooltip
                  formatter={(v: number) => [moneyTooltip(v), 'Base salary']}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Area type="monotone" dataKey="takeHome" name="Base salary" stroke="var(--foreground)" fill="var(--foreground)" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </AnalyticsChartCard>
        ) : null}

        <AnalyticsChartCard
          title="Bank Balance Projection"
          subtitle={`If recent pace continues (${formatRupees(monthlyPace)}/mo)`}
        >
          <ChartContainer height={isMobile ? 180 : 200}>
            <AreaChart data={projection} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.35} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: axisTickMuted }} axisLine={false} tickLine={false} interval={isMobile ? 3 : 2} minTickGap={20} />
              <YAxis tick={{ fontSize: 10, fill: axisTickMuted }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} />
              <Tooltip
                formatter={(v: number) => moneyTooltip(v)}
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
              />
              <Area type="monotone" dataKey="balance" name="Projected balance" stroke="var(--foreground)" fill="var(--foreground)" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </AnalyticsChartCard>
      </section>
    </div>
  );
}
