'use client';

import React, { useMemo } from 'react';
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
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart
} from 'recharts';
import type { FinancialSummary } from '@/lib/financial-analysis';
import { formatRupees } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
          strokeLinecap="square"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-7xl font-black text-foreground tracking-tighter leading-none">
          {score}
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-4">
          Vitality Unit
        </span>
      </div>
    </div>
  );
};

export default function FinancialHealthPageClient({
  initialData,
}: FinancialHealthPageClientProps) {
  const { theme, setTheme, isDark } = useTheme();

  // 1. Calculate Health Score (Multi-dimensional)
  const healthScore = useMemo(() => {
    let score = 0;
    // Savings Rate (Max 40 pts)
    score += Math.min(initialData.savingsRate * 1.5, 40);
    // Debt Ratio (Max 30 pts)
    const dti = initialData.debtAmount / (initialData.totalIncome || 1);
    score += dti === 0 ? 30 : Math.max(0, 30 - dti * 50);
    // Diversity/Goals (Max 30 pts)
    score += Math.min(initialData.goalsProgress.length * 10, 30);
    return Math.round(Math.min(score, 100));
  }, [initialData]);

  // 2. Trajectory Data Fix
  const chartData = useMemo(() => {
    if (!initialData.incomeTrends || initialData.incomeTrends.length === 0) return [];
    return initialData.incomeTrends.slice(-6).map(d => ({
      month: d.month.split('-')[1],
      amount: d.amount,
      formattedAmount: formatRupees(d.amount)
    }));
  }, [initialData.incomeTrends]);

  // Calculate Trend Percentage
  const trendPercentage = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0].amount;
    const last = chartData[chartData.length - 1].amount;
    return first === 0 ? 0 : ((last - first) / first) * 100;
  }, [chartData]);

  // Peer Benchmark
  const PEER_AVG_SCORE = 62;

  // Sector Metrics
  const stability = Math.round(initialData.debtAmount === 0 ? 98 : Math.max(0, 100 - (initialData.debtAmount / (initialData.totalIncome || 1)) * 100));
  const growth = Math.round(Math.min(initialData.savingsRate * 2.5, 100));
  const risk = Math.round(Math.min(((initialData.totalExpenses / (initialData.totalIncome || 1)) * 100) + (initialData.debtAmount > 0 ? 15 : 0), 100));

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-y-auto custom-scrollbar">
      {/* Header */}
      {/* Header - Industrial Audit */}
      <header className="h-12 px-4 md:px-6 flex items-center justify-between border-b border-border bg-card sticky top-0 z-50">
        <div>
          <h1 className="text-lg font-black uppercase tracking-tighter text-foreground">
            Financial Health Audit
          </h1>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Diagnostic Protocol v4.0.1</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="h-8 w-8 p-0 rounded-none border-border"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" className="hidden sm:flex h-8 bg-foreground text-background hover:bg-primary hover:text-primary-foreground rounded-none font-black text-[9px] uppercase tracking-widest">
            <Sparkles className="w-3 h-3 mr-2" />
            <span>Recalibrate Diagnostics</span>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full pb-20">

        {/* Top Section: Vitality & Trajectory */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">

          {/* Vitality Gauge */}
          <div className="lg:col-span-5 card-base p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-theme-secondary mb-10">Unit Vitality Assessment</span>

            <div className="relative">
              <HealthGauge score={healthScore} />
            </div>

            <div className="mt-10 grid grid-cols-2 w-full gap-8 border-t border-border pt-8">
              <div className="text-left">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-2">Global Ranking</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black tabular-nums">TOP {healthScore > 80 ? '2%' : healthScore > 60 ? '12%' : '28%'}</span>
                </div>
              </div>
              <div className="text-left border-ml border-border pl-8">
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-2">Sector Median</p>
                <span className="text-2xl font-black tabular-nums text-muted-foreground/40">{PEER_AVG_SCORE}</span>
              </div>
            </div>
          </div>

          {/* Trajectory Area Chart - Solid Industrial */}
          <div className="lg:col-span-7 card-base p-8 flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Efficiency Baseline</h3>
                <p className="text-4xl font-black mt-2 text-foreground tracking-tighter tabular-nums">
                  {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
                </p>
              </div>
              <Badge variant="outline" className={cn(
                "px-3 py-1.5 rounded-none border font-black text-[9px] uppercase tracking-widest",
                trendPercentage >= 0 ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" : "bg-rose-500/5 text-rose-500 border-rose-500/20"
              )}>
                {trendPercentage >= 0 ? <TrendingUp className="w-3 h-3 mr-2" /> : <TrendingDown className="w-3 h-3 mr-2" />}
                {trendPercentage >= 0 ? 'Surging' : 'Volatility'}
              </Badge>
            </div>

            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="card-base p-4 border-primary/40 shadow-none">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">{payload[0].payload.month}</p>
                            <p className="text-lg font-black text-primary tabular-nums">{payload[0].payload.formattedAmount}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--primary)"
                    strokeWidth={4}
                    fillOpacity={0.1}
                    fill="var(--primary)"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex justify-between px-2 mt-6">
                {chartData.map((d, i) => (
                  <span key={i} className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest">{d.month}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analysis Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-4 px-2">
            <span className="h-px flex-1 bg-border/10"></span>
            <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.6em] whitespace-nowrap">Sector Diagnostics</h3>
            <span className="h-px flex-1 bg-border/10"></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Stability Card */}
            <div className="card-base p-6 border-l-4 border-l-blue-500 hover:bg-muted/5 transition-all">
              <div className="flex justify-between items-start mb-10">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20">
                  <Wallet className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black leading-none tabular-nums">{stability}</span>
                  <span className="text-[10px] text-muted-foreground font-black ml-1 uppercase">Unit</span>
                </div>
              </div>
              <h4 className="font-black text-base uppercase tracking-tight mb-1">Financial Stability</h4>
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-50">Debt-to-Income Audit</p>

              <div className="mt-8 space-y-3">
                <div className="w-full bg-muted h-1 rounded-none overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${stability}%` }}></div>
                </div>
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <span>Fragile</span>
                  <span>Rock Solid</span>
                </div>
              </div>
            </div>

            {/* Growth Card */}
            <div className="card-base p-6 border-l-4 border-l-emerald-500 hover:bg-muted/5 transition-all">
              <div className="flex justify-between items-start mb-10">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black leading-none tabular-nums">{growth}</span>
                  <span className="text-[10px] text-muted-foreground font-black ml-1 uppercase">Unit</span>
                </div>
              </div>
              <h4 className="font-black text-base uppercase tracking-tight mb-1">Growth Engine</h4>
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-50">Savings Efficiency Ratio</p>

              <div className="mt-8 space-y-3">
                <div className="w-full bg-muted h-1 rounded-none overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${growth}%` }}></div>
                </div>
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <span>Stagnant</span>
                  <span>Exponential</span>
                </div>
              </div>
            </div>

            {/* Security/Risk Card */}
            <div className="card-base p-6 border-l-4 border-l-rose-500 hover:bg-muted/5 transition-all">
              <div className="flex justify-between items-start mb-10">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20">
                  <Shield className="w-5 h-5 text-rose-500" />
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black leading-none tabular-nums">{100 - risk}</span>
                  <span className="text-[10px] text-muted-foreground font-black ml-1 uppercase">Unit</span>
                </div>
              </div>
              <h4 className="font-black text-base uppercase tracking-tight mb-1">System Security</h4>
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-50">Capital Risk Exposure</p>

              <div className="mt-8 space-y-3">
                <div className="w-full bg-muted h-1 rounded-none overflow-hidden">
                  <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${100 - risk}%` }}></div>
                </div>
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <span>Exposed</span>
                  <span>Fortified</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strategic Roadmap - Solid Terminal */}
        <div className="card-base p-8 md:p-12 border-dashed border-primary/40 bg-muted/5 flex flex-col lg:flex-row items-center justify-between gap-10 overflow-hidden relative">
          <div className="flex items-start gap-10 w-full lg:max-w-4xl">
            <div className="w-20 h-20 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Lightbulb className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Strategic Directive Active</span>
              </div>
              <p className="text-2xl md:text-3xl text-foreground font-black leading-tight tracking-tighter uppercase">
                {initialData.topExpenseCategories.length > 0
                  ? `Optimize capital efficiency by auditing the ${initialData.topExpenseCategories[0].percentage.toFixed(1)}% concentration in ${initialData.topExpenseCategories[0].category}.`
                  : 'System data required for advanced strategic reallocation mapping.'}
              </p>
              <div className="flex flex-wrap items-center gap-8 pt-4">
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-primary opacity-40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target: 85+ Vitality</span>
                </div>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-primary opacity-40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status: Integrated</span>
                </div>
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full lg:w-auto h-16 px-12 bg-foreground text-background hover:bg-primary hover:text-primary-foreground rounded-none font-black text-[11px] uppercase tracking-[0.2em] transition-all">
            <span>Execute AI Strategy</span>
            <ArrowRight className="ml-4 w-5 h-5" />
          </Button>
        </div>

      </div>
    </div>
  );
}
