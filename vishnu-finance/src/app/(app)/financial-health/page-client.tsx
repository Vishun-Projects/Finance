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
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/10"
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
        <span className="text-7xl font-black text-foreground tracking-tighter leading-none font-display">
          {score}
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-3 opacity-60">
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
      <header className="h-20 px-6 md:px-10 flex items-center justify-between border-b border-border/10 shrink-0 bg-background/60 backdrop-blur-2xl sticky top-0 z-50">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground font-display">
            Financial Health <span className="text-primary">Audit</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">System Version 4.0.2</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-3 glass-card rounded-2xl text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button className="hidden sm:flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-2xl font-black text-[10px] transition-all hover:scale-105 active:scale-95 uppercase tracking-widest shadow-xl shadow-primary/20">
            <Sparkles className="w-4 h-4" />
            <span>Regenerate AI Audit</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto w-full pb-32">

        {/* Top Section: Vitality & Trajectory */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

          {/* Vitality Gauge */}
          <div className="lg:col-span-5 glass-card p-10 rounded-[3rem] flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Heart className="w-32 h-32 text-primary" />
            </div>

            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-10 z-10">Overall Vitality Score</span>

            <div className="relative z-10">
              <HealthGauge score={healthScore} />
            </div>

            <div className="mt-12 grid grid-cols-2 w-full gap-8 border-t border-border/10 pt-10 z-10">
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-2 opacity-60">Global Stat</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-display">Top {healthScore > 80 ? '2%' : healthScore > 60 ? '12%' : '28%'}</span>
                </div>
              </div>
              <div className="text-left border-l border-border/10 pl-8">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-2 opacity-60">Peer Average</p>
                <span className="text-2xl font-black font-display text-muted-foreground/60">{PEER_AVG_SCORE}</span>
              </div>
            </div>
          </div>

          {/* Trajectory Area Chart */}
          <div className="lg:col-span-7 glass-card p-10 rounded-[3rem] flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em]">Efficiency Trajectory</h3>
                <p className="text-4xl font-black mt-2 text-foreground font-display tracking-tighter">
                  {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
                </p>
              </div>
              <Badge className={cn(
                "px-4 py-2 rounded-xl border-none font-black text-[10px] uppercase tracking-widest",
                trendPercentage >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}>
                {trendPercentage >= 0 ? <TrendingUp className="w-4 h-4 mr-2" /> : <TrendingDown className="w-4 h-4 mr-2" />}
                {trendPercentage >= 0 ? 'Surging' : 'Volatility Detected'}
              </Badge>
            </div>

            <div className="flex-1 w-full min-h-[250px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="glass-card p-4 rounded-2xl border-primary/20 shadow-2xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{payload[0].payload.month}</p>
                            <p className="text-lg font-black text-primary">{payload[0].payload.formattedAmount}</p>
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
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex justify-between px-2 mt-4">
                {chartData.map((d, i) => (
                  <span key={i} className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">{d.month}</span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Stability Card */}
            <div className="glass-card p-8 rounded-[2.5rem] group hover:bg-primary/[0.02] transition-all duration-500 border-l-4 border-l-blue-500/40">
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/10 group-hover:scale-110 transition-transform">
                  <Wallet className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black font-display leading-none">{stability}</span>
                  <span className="text-xs text-muted-foreground font-black ml-1">/100</span>
                </div>
              </div>
              <h4 className="font-black text-lg uppercase tracking-tight mb-1">Financial Stability</h4>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed opacity-60">Debt-to-Income Audit</p>

              <div className="mt-8 space-y-3">
                <div className="w-full bg-muted/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${stability}%` }}></div>
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <span>Fragile</span>
                  <span>Rock Solid</span>
                </div>
              </div>
            </div>

            {/* Growth Card */}
            <div className="glass-card p-8 rounded-[2.5rem] group hover:bg-primary/[0.02] transition-all duration-500 border-l-4 border-l-emerald-500/40">
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black font-display leading-none">{growth}</span>
                  <span className="text-xs text-muted-foreground font-black ml-1">/100</span>
                </div>
              </div>
              <h4 className="font-black text-lg uppercase tracking-tight mb-1">Growth Engine</h4>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed opacity-60">Savings Efficiency Ratio</p>

              <div className="mt-8 space-y-3">
                <div className="w-full bg-muted/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${growth}%` }}></div>
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <span>Stagnant</span>
                  <span>Exponential</span>
                </div>
              </div>
            </div>

            {/* Security/Risk Card */}
            <div className="glass-card p-8 rounded-[2.5rem] group hover:bg-primary/[0.02] transition-all duration-500 border-l-4 border-l-rose-500/40">
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/10 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6 text-rose-500" />
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black font-display leading-none">{100 - risk}</span>
                  <span className="text-xs text-muted-foreground font-black ml-1">/100</span>
                </div>
              </div>
              <h4 className="font-black text-lg uppercase tracking-tight mb-1">System Security</h4>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed opacity-60">Capital Risk Exposure</p>

              <div className="mt-8 space-y-3">
                <div className="w-full bg-muted/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]" style={{ width: `${100 - risk}%` }}></div>
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <span>Exposed</span>
                  <span>Fortified</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strategic Roadmap (Bottom Section) */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-[3rem] -z-10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="glass-card p-10 md:p-14 rounded-[3rem] border-dashed border-primary/30 flex flex-col lg:flex-row items-center justify-between gap-10 overflow-hidden relative">

            <div className="flex items-start gap-8 z-10 w-full lg:max-w-3xl">
              <div className="w-20 h-20 rounded-[2rem] glass-card flex items-center justify-center shadow-2xl shadow-primary/20 border-primary/20 shrink-0 bg-primary/5">
                <Lightbulb className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/10 text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Live Strategic Insight</span>
                </div>
                <p className="text-xl md:text-2xl text-foreground font-medium leading-tight font-display">
                  {initialData.topExpenseCategories.length > 0
                    ? `Optimize capital efficiency by auditing the ${initialData.topExpenseCategories[0].percentage.toFixed(1)}% concentration in ${initialData.topExpenseCategories[0].category}.`
                    : 'System data required for advanced strategic reallocation mapping.'}
                </p>
                <div className="flex items-center gap-6 mt-6">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary opacity-60" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target: 85+ Vitality</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-primary opacity-60" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Updated Now</span>
                  </div>
                </div>
              </div>
            </div>

            <button className="w-full lg:w-auto text-[11px] font-black uppercase tracking-widest bg-foreground text-background px-12 py-5 rounded-2xl hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-foreground/10 z-10 group/btn">
              <span>Execute AI Strategy</span>
              <ArrowRight className="inline-block ml-3 w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
