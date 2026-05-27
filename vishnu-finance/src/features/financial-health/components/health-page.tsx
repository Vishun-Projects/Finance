'use client';

import React, { useMemo } from 'react';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Wallet,
  Shield,
  Lightbulb,
  Sun,
  Moon,
  Sparkles,
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
import { formatRupees } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHero } from '@/components/ui/hero';
import { patterns } from '@/design/patterns';
import { chipVariants } from '@/design/variants';

interface FinancialHealthPageClientProps {
  initialData: FinancialSummary;
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
}: FinancialHealthPageClientProps) {
  const { setTheme, isDark } = useTheme();
  const isMdUp = useBreakpoint('md');

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

  const PEER_AVG_SCORE = 62;

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
  ] as const;

  return (
    <>
        <div className="mb-5 flex items-start justify-between gap-4">
          <PageHero
            tag="Diagnostics"
            title="Financial health"
            subtitle="A snapshot of savings, debt, and goal progress."
          />
          <Button size="sm" className="hidden sm:inline-flex">
            <Sparkles className="mr-2 size-3.5" />
            Recalculate
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="card-base flex flex-col items-center justify-center p-4 text-center sm:p-8 lg:col-span-5">
            <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.08em] text-hint sm:mb-8">Overall score</p>
            <div className="mx-auto w-full max-w-[260px]">
              <HealthGauge score={healthScore} size={220} />
            </div>
            <div className="mt-10 grid w-full grid-cols-2 gap-4 border-t border-border pt-4 sm:gap-8 sm:pt-8">
              <div className="text-left">
                <p className="mb-2 text-xs text-hint">Global ranking</p>
                <p className="text-xl font-medium tabular-nums">
                  Top {healthScore > 80 ? '2%' : healthScore > 60 ? '12%' : '28%'}
                </p>
              </div>
              <div className="border-l border-border pl-8 text-left">
                <p className="mb-2 text-xs text-hint">Peer median</p>
                <p className="text-xl font-medium tabular-nums text-muted">{PEER_AVG_SCORE}</p>
              </div>
            </div>
          </div>

          <div className="card-base flex flex-col p-4 md:p-8 lg:col-span-7">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Income trend</h3>
                <p className="mt-2 text-3xl font-medium tabular-nums text-foreground">
                  {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
                </p>
              </div>
              <Badge variant="outline" className={chipVariants({
                variant: trendPercentage >= 0 ? 'success' : 'danger',
              })}>
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

        <div className="mt-8">
          <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Sector breakdown</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sectorCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="card-base p-6">
                  <div className="mb-8 flex items-start justify-between">
                    <div className={cn('rounded-md border p-3', card.iconWrap)}>
                      <Icon className="size-5" />
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-medium tabular-nums leading-none">{card.value}</span>
                      <span className="ml-1 text-xs text-hint">/ 100</span>
                    </div>
                  </div>
                  <h4 className="text-base font-medium text-foreground">{card.title}</h4>
                  <p className="mt-1 text-xs text-muted">{card.subtitle}</p>
                  <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full transition-all duration-1000', card.barClass)} style={{ width: `${card.value}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-base mt-8 flex flex-col items-start justify-between gap-8 border-dashed p-4 md:flex-row md:items-center md:p-8">
          <div className="flex max-w-3xl items-start gap-5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-border bg-surface">
              <Lightbulb className="size-7 text-primary" />
            </div>
            <div className="space-y-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary">Recommended action</p>
              <p className="text-xl font-medium leading-snug text-foreground">
                {initialData.topExpenseCategories.length > 0
                  ? `Review spending in ${initialData.topExpenseCategories[0].category}, which accounts for ${initialData.topExpenseCategories[0].percentage.toFixed(1)}% of expenses.`
                  : 'Add more transaction data to unlock personalized recommendations.'}
              </p>
              <div className="flex flex-wrap items-center gap-6 text-xs text-muted">
                <span className="inline-flex items-center gap-2">
                  <Target className="size-3.5 text-hint" />
                  Target score: 85+
                </span>
                <span className="inline-flex items-center gap-2">
                  <AlertCircle className="size-3.5 text-hint" />
                  Data synced
                </span>
              </div>
            </div>
          </div>
          <Button size="lg" className="w-full md:w-auto">
            View AI strategy
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
    </>
  );
}
