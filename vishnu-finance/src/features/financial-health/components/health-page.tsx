'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Wallet,
  Shield,
  Lightbulb,
  ArrowRight,
  Target,
  AlertCircle
} from 'lucide-react';
import { ChartContainer } from '@/components/ui/chart-container';
import {
  Area,
  AreaChart,
  Tooltip,
  XAxis,
} from 'recharts';
import type { FinancialSummary } from '@/lib/financial-analysis';
import type { DashboardBootstrap } from '@/features/dashboard/types';
import { TakeHomeAnchor } from '@/components/finance/take-home-anchor';
import { PageMandate } from '@/components/layout/page-mandate';
import { PlanDisciplineStrip } from '@/components/finance/plan-discipline-strip';
import {
  computeSafeToSpend,
  formatDisciplineCurrency,
} from '@/lib/plans-discipline';
import { formatRupees } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { patterns } from '@/design/patterns';
import { chipVariants } from '@/design/variants';
import { TaxHintsPanel } from '@/features/financial-health/components/tax-hints-panel';
import { CashflowForecastPanel } from '@/features/financial-health/components/cashflow-forecast-panel';

interface FinancialHealthPageClientProps {
  initialData: FinancialSummary;
  monthContext?: DashboardBootstrap;
}

const HealthGauge = ({ score, size = 260 }: { score: number; size?: number }) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-primary transition-all duration-1000 ease-in-out"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-medium tabular-nums text-foreground leading-none sm:text-6xl">{score}</span>
        <span className="mt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Health score</span>
      </div>
    </div>
  );
};

export default function FinancialHealthPageClient({
  initialData,
  monthContext,
}: FinancialHealthPageClientProps) {
  const isMdUp = useBreakpoint('lg');

  const healthScore = useMemo(() => {
    let score = 0;
    score += Math.min(initialData.savingsRate * 1.5, 40);
    const dti = initialData.debtAmount / (initialData.totalIncome || 1);
    score += dti === 0 ? 30 : Math.max(0, 30 - dti * 50);
    score += Math.min(initialData.goalsProgress.length * 10, 30);
    return Math.round(Math.min(score, 100));
  }, [initialData]);

  const chartData = useMemo(() => {
    if (!initialData.incomeTrends || initialData.incomeTrends.length === 0) return [];
    return initialData.incomeTrends.slice(-6).map(d => ({
      month: d.month.split('-')[1],
      amount: d.amount,
      formattedAmount: formatRupees(d.amount)
    }));
  }, [initialData.incomeTrends]);

  const trendPercentage = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0].amount;
    const last = chartData[chartData.length - 1].amount;
    return first === 0 ? 0 : ((last - first) / first) * 100;
  }, [chartData]);

  const monthDiscipline = monthContext?.disciplineSummary;
  const monthAdherence = monthContext?.adherence;
  const commitmentCoverage =
    monthDiscipline && monthDiscipline.totalRequiredPerMonth > 0
      ? Math.round(
          (monthDiscipline.capacity.available / monthDiscipline.totalRequiredPerMonth) * 100,
        )
      : null;

  const safeToSpend = useMemo(() => {
    if (!monthDiscipline) return null;
    const upcoming = monthDiscipline.deadlines
      .filter((d) => d.isDueThisMonth || d.isOverdue)
      .reduce((sum, d) => sum + d.requiredThisMonth, 0);
    return computeSafeToSpend(monthDiscipline, upcoming);
  }, [monthDiscipline]);

  const stability = Math.round(initialData.debtAmount === 0 ? 98 : Math.max(0, 100 - (initialData.debtAmount / (initialData.totalIncome || 1)) * 100));
  const growth = Math.round(Math.min(initialData.savingsRate * 2.5, 100));
  const risk = Math.round(Math.min(((initialData.totalExpenses / (initialData.totalIncome || 1)) * 100) + (initialData.debtAmount > 0 ? 15 : 0), 100));

  const sectorCards = [
    {
      title: 'Financial stability',
      subtitle: 'Debt-to-income ratio',
      value: stability,
      icon: Wallet,
      barClass: 'bg-info',
      iconWrap: 'border-[var(--chip-info-border)] bg-[var(--chip-info-bg)] text-info',
    },
    {
      title: 'Growth engine',
      subtitle: 'Savings efficiency',
      value: growth,
      icon: TrendingUp,
      barClass: 'bg-success',
      iconWrap: 'border-[var(--chip-success-border)] bg-[var(--chip-success-bg)] text-success',
    },
    {
      title: 'System security',
      subtitle: 'Capital risk exposure',
      value: 100 - risk,
      icon: Shield,
      barClass: 'bg-danger',
      iconWrap: 'border-[var(--chip-danger-border)] bg-[var(--chip-danger-bg)] text-danger',
    },
    ...(monthAdherence
      ? [
          {
            title: 'This month plan',
            subtitle: `${monthAdherence.monthLabel} adherence`,
            value: monthAdherence.overallScore,
            icon: Target,
            barClass: 'bg-info',
            iconWrap: 'border-[var(--chip-info-border)] bg-[var(--chip-info-bg)] text-info',
          },
        ]
      : []),
    ...(commitmentCoverage !== null
      ? [
          {
            title: 'Commitment coverage',
            subtitle: 'Available vs required/mo',
            value: Math.min(100, commitmentCoverage),
            icon: AlertCircle,
            barClass: commitmentCoverage >= 100 ? 'bg-success' : 'bg-warning',
            iconWrap:
              commitmentCoverage >= 100
                ? 'border-[var(--chip-success-border)] bg-[var(--chip-success-bg)] text-success'
                : 'border-[var(--chip-warning-border)] bg-[var(--chip-warning-bg)] text-warning',
          },
        ]
      : []),
  ] as const;

  return (
    <>
        <PageMandate
          className="mb-4"
          title="Financial health"
          mandate="Score, trends, and tax hints — a longitudinal view of your finances."
          metrics={[
            { label: 'Health score', value: String(healthScore) },
            {
              label: 'Plan score',
              value: `${monthAdherence?.overallScore ?? 0}%`,
            },
            {
              label: 'Safe to spend',
              value: safeToSpend != null ? formatDisciplineCurrency(safeToSpend.safeToSpend) : '—',
            },
          ]}
        />

        {monthAdherence && (
          <TakeHomeAnchor
            baseIncome={monthAdherence.planBaseIncome}
            source={monthAdherence.planIncomeSource}
            variant="compact"
            className="mb-3 max-lg:mb-2"
            activeSalaryTakeHome={monthContext?.planIncomeContext.activeSalaryTakeHome}
            currentMonthSalaryReceived={monthContext?.planIncomeContext.currentMonthSalaryReceived}
            lastMonthSalaryReceived={monthContext?.planIncomeContext.lastMonthSalaryReceived}
            receivedSalarySource={monthContext?.planIncomeContext.receivedSalarySource}
          />
        )}

        {monthDiscipline ? (
          <PlanDisciplineStrip summary={monthDiscipline} className="mb-4 hidden md:block" />
        ) : null}

        <div className="grid grid-cols-1 gap-4 max-lg:gap-3 lg:grid-cols-12 lg:gap-5">
          <div className="card-base flex flex-col items-center justify-center p-4 text-center max-lg:p-3 sm:p-8 lg:col-span-5">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-hint sm:mb-6">Overall score</p>
            <div className="mx-auto w-full max-w-[220px] sm:max-w-[260px]">
              <HealthGauge score={healthScore} size={isMdUp ? 220 : 180} />
            </div>
            <div className="mt-6 grid w-full grid-cols-1 gap-3 border-t border-border pt-4 sm:mt-8 sm:grid-cols-2 sm:gap-4 sm:pt-6">
              <div className="text-left sm:border-r sm:border-border sm:pr-4">
                <p className="mb-1 text-xs text-hint">Commitment coverage</p>
                <p className="text-lg font-medium tabular-nums sm:text-xl">
                  {commitmentCoverage !== null ? `${commitmentCoverage}%` : '—'}
                </p>
              </div>
              <div className="text-left sm:pl-4">
                <p className="mb-1 text-xs text-hint">Safe to spend</p>
                <p className="truncate text-lg font-medium tabular-nums text-muted sm:text-xl">
                  {safeToSpend ? formatDisciplineCurrency(safeToSpend.safeToSpend) : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="card-base flex flex-col p-4 max-lg:p-3 md:p-8 lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2 sm:mb-6">
              <div className="min-w-0">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Income trend</h3>
                <p className="mt-1 text-2xl font-medium tabular-nums text-foreground sm:mt-2 sm:text-3xl">
                  {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
                </p>
              </div>
              <Badge variant="outline" className={cn('shrink-0', chipVariants({
                variant: trendPercentage >= 0 ? 'success' : 'danger',
              }))}>
                {trendPercentage >= 0 ? <TrendingUp className="mr-1.5 size-3" /> : <TrendingDown className="mr-1.5 size-3" />}
                {trendPercentage >= 0 ? 'Improving' : 'Declining'}
              </Badge>
            </div>

            {chartData.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-sm text-muted">
                Not enough income history to chart yet.
              </div>
            ) : (
            <ChartContainer height={isMdUp ? 250 : 200}>
              <AreaChart data={chartData}>
                <Tooltip
                  formatter={(value: number) => formatRupees(value)}
                  labelFormatter={(label) => `Month ${label}`}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                />
                <XAxis dataKey="month" hide />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  fillOpacity={0.12}
                  fill="var(--foreground)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ChartContainer>
            )}
          </div>
        </div>

        <div className="mt-6 max-lg:mt-4">
          <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-hint max-lg:mb-2">Sector breakdown</h3>
          <div className="grid grid-cols-1 gap-3 max-lg:gap-2 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {sectorCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="card-base p-4 max-lg:p-3 sm:p-6">
                  <div className="mb-4 flex items-start justify-between sm:mb-6">
                    <div className={cn('rounded-md border p-2.5 sm:p-3', card.iconWrap)}>
                      <Icon className="size-4 sm:size-5" />
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-medium tabular-nums leading-none sm:text-3xl">{card.value}</span>
                      <span className="ml-1 text-xs text-hint">/ 100</span>
                    </div>
                  </div>
                  <h4 className="text-sm font-medium text-foreground sm:text-base">{card.title}</h4>
                  <p className="mt-1 text-xs text-muted">{card.subtitle}</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted sm:mt-6">
                    <div className={cn('h-full transition-all duration-1000', card.barClass)} style={{ width: `${card.value}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-4 max-lg:mt-4 lg:grid-cols-2">
          <CashflowForecastPanel />
          <TaxHintsPanel />
        </div>

        <div className="card-base mt-6 flex flex-col items-start justify-between gap-4 border-dashed p-4 max-lg:mt-4 max-lg:gap-3 md:flex-row md:items-center md:gap-8 md:p-8">
          <div className="flex min-w-0 max-w-3xl items-start gap-3 sm:gap-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface sm:size-14">
              <Lightbulb className="size-6 text-primary sm:size-7" />
            </div>
            <div className="min-w-0 space-y-3 sm:space-y-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary">Recommended action</p>
              <p className="text-base font-medium leading-snug text-foreground sm:text-xl">
                {monthDiscipline && monthDiscipline.gap < 0
                  ? `You're ${formatDisciplineCurrency(Math.abs(monthDiscipline.gap))} short on monthly commitments — review Plans.`
                  : initialData.topExpenseCategories.length > 0
                    ? `Review spending in ${initialData.topExpenseCategories[0].category}, which accounts for ${initialData.topExpenseCategories[0].percentage.toFixed(1)}% of expenses.`
                    : 'Add more transaction data to unlock personalized recommendations.'}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {initialData.topExpenseCategories.length > 0 && (
                  <Button variant="outline" size="sm" className="h-7" asChild>
                    <Link href={`/transactions?search=${encodeURIComponent(initialData.topExpenseCategories[0].category)}`}>
                      View transactions
                    </Link>
                  </Button>
                )}
                {monthDiscipline && monthDiscipline.gap < 0 && (
                  <Button variant="outline" size="sm" className="h-7" asChild>
                    <Link href="/plans">Open Plans</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
          <Button size="lg" className="w-full md:w-auto" asChild>
            <Link href="/advisor">
              View AI strategy
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
    </>
  );
}
