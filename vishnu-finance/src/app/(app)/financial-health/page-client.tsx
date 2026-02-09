'use client';

import React, { useMemo } from 'react';
import {
  Bolt,
  LayoutGrid,
  Heart,
  ReceiptText,
  Calendar,
  Bot,
  Settings,
  Bell,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
  Shield,
  Lightbulb,
  Sun,
  Moon,
  Search
} from 'lucide-react';
import type { FinancialSummary } from '@/lib/financial-analysis';
import { formatRupees } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface FinancialHealthPageClientProps {
  initialData: FinancialSummary;
}

export default function FinancialHealthPageClient({
  initialData,
}: FinancialHealthPageClientProps) {
  const { theme, setTheme, isDark } = useTheme();

  // 1. Calculate Health Score (Dynamic)
  const healthScore = useMemo(() => {
    let score = 0;
    // Savings Rate (Max 50 pts for > 30% savings)
    const savingsScore = Math.min(initialData.savingsRate * 1.6, 50);
    score += Math.max(0, savingsScore);

    // Debt (Max 30 pts for 0 debt)
    if (initialData.debtAmount === 0) score += 30;
    else if (initialData.debtAmount < initialData.totalIncome) score += 15;

    // Goals (Max 20 pts for > 0 progress)
    if (initialData.goalsProgress.length > 0) score += 20;

    return Math.round(Math.min(score, 100));
  }, [initialData]);

  // 2. Trend Data (Last 6 months)
  const trendData = initialData.incomeTrends.slice(-6);
  // Calculate Trend Percentage
  const trendPercentage = useMemo(() => {
    if (trendData.length < 2) return 0;
    const first = trendData[0].amount;
    const last = trendData[trendData.length - 1].amount;
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }, [trendData]);

  // SVG Path Generation
  const trendPath = useMemo(() => {
    if (trendData.length < 2) return '';
    const maxVal = Math.max(...trendData.map(d => d.amount)) || 1;
    const width = 400;
    const height = 100;

    const points = trendData.map((d, i) => {
      const x = (i / (trendData.length - 1)) * width;
      const y = height - (d.amount / maxVal) * 80;
      return `${x},${y}`;
    }).join(' L ');

    return `M ${points}`;
  }, [trendData]);

  const trendAreaPath = useMemo(() => {
    if (!trendPath) return '';
    return `${trendPath} L 400,100 L 0,100 Z`;
  }, [trendPath]);

  // Stability Metric
  const stabilityScore = initialData.debtAmount === 0
    ? 95
    : Math.max(0, 100 - (initialData.debtAmount / (initialData.totalIncome || 1)) * 100);

  // Growth Metric
  const growthScore = Math.min(initialData.savingsRate * 2.5, 100);

  // Risk Score (Dynamic)
  const riskScore = useMemo(() => {
    if (initialData.totalIncome === 0) return 0;
    const expenseRatio = (initialData.totalExpenses / initialData.totalIncome) * 100;
    const debtFactor = initialData.debtAmount > 0 ? 20 : 0;
    return Math.min(Math.round(expenseRatio + debtFactor), 100);
  }, [initialData]);

  // Peer Benchmark (Constant)
  const PEER_AVG_SCORE = 62;

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-y-auto custom-scrollbar">

      {/* Header */}
      <header className="h-16 lg:h-20 px-4 md:px-8 flex items-center justify-between border-b border-border/10 shrink-0 bg-background/60 backdrop-blur-xl sticky top-0 z-30">
        <div>
          <h1 className="text-xl md:text-3xl font-display font-medium tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Financial Health
          </h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button className="hidden sm:flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full font-bold text-[10px] transition-transform hover:scale-[1.02] active:scale-95 uppercase tracking-wider mr-2 font-display">
            <Sparkles className="w-3 h-3" />
            <span>AI Audit</span>
          </button>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>

          <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-destructive rounded-full"></span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 md:p-8 pt-20 lg:pt-8 space-y-8 max-w-7xl mx-auto w-full pb-24">
        <div className="grid grid-cols-12 gap-6">

          {/* Health Score Card */}
          <div className="col-span-12 lg:col-span-5 glass-card p-6 md:p-8 rounded-3xl flex flex-col items-center justify-center text-center shadow-xl shadow-primary/5 border-l-4 border-l-primary/40">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">Overall Vitality</span>
            <div className="relative flex items-center justify-center w-56 h-56 md:w-64 md:h-64">
              <svg className="w-full h-full -rotate-90">
                <circle className="text-muted/10" cx="128" cy="128" fill="transparent" r="110" stroke="currentColor" strokeWidth="4"></circle>
                <circle
                  className="text-primary transition-all duration-1000 ease-out"
                  cx="128" cy="128" fill="transparent" r="110"
                  stroke="currentColor"
                  strokeDasharray="691.15"
                  strokeDashoffset={691.15 - (691.15 * healthScore) / 100}
                  strokeLinecap="round"
                  strokeWidth="8"
                ></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-7xl font-bold tracking-tighter animate-fade-in text-primary font-display">{healthScore}</span>
                <span className="text-[10px] font-black text-muted-foreground mt-2 uppercase tracking-[0.2em]">
                  {healthScore >= 80 ? 'Elite' : healthScore >= 60 ? 'Optimal' : 'Baseline'}
                </span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 w-full gap-4 border-t border-border/30 pt-8">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Global Percentile</p>
                <p className="text-xl font-bold font-display">Top {healthScore > 80 ? '4%' : healthScore > 60 ? '15%' : '35%'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Community Avg</p>
                <p className="text-xl font-bold font-display">{PEER_AVG_SCORE}</p>
              </div>
            </div>
          </div>

          {/* Trend Card */}
          <div className="col-span-12 lg:col-span-7 glass-card p-6 md:p-8 rounded-3xl flex flex-col shadow-xl shadow-primary/5">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">6 Month Trajectory</h3>
                <p className="text-2xl md:text-3xl font-bold mt-1 text-primary font-display">
                  {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
                </p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${trendPercentage >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                {trendPercentage >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                )}
                <span className={`text-[10px] font-black uppercase tracking-widest ${trendPercentage >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {trendPercentage >= 0 ? 'Surging' : 'Declining'}
                </span>
              </div>
            </div>

            <div className="flex-1 w-full relative min-h-[200px] md:min-h-[240px]">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 100">
                <path className="text-primary/60" d={trendPath} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke"></path>
                <path d={trendAreaPath} fill="url(#gradient)" opacity="0.1"></path>
                <defs>
                  <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop className="text-primary" offset="0%" style={{ stopColor: 'currentColor', stopOpacity: 1 }}></stop>
                    <stop className="text-primary" offset="100%" style={{ stopColor: 'currentColor', stopOpacity: 0 }}></stop>
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex justify-between mt-6 px-1">
                {trendData.map((d, i) => (
                  <span key={i} className="text-[9px] font-black text-muted-foreground tracking-[0.2em] uppercase opacity-60">
                    {d.month.split('-')[1]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Sector Analysis</h3>
            <button className="text-[10px] font-black text-primary hover:text-primary/80 transition-colors uppercase tracking-[0.2em]">Full History</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Stability */}
            <div className="glass-card p-6 rounded-2xl flex items-center gap-6 group hover:bg-muted/10 transition-all border-l-4 border-l-blue-500/40 shadow-lg shadow-blue-500/5">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Wallet className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="font-bold text-lg leading-none mb-1 font-display">Stability</h3>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Debt-to-Income</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold tracking-tight font-display">{Math.round(stabilityScore)}</span>
                    <span className="text-[10px] text-muted-foreground font-bold">/100</span>
                  </div>
                </div>
                <div className="w-full bg-muted/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-1000 ease-out" style={{ width: `${stabilityScore}%` }}></div>
                </div>
              </div>
            </div>

            {/* Growth */}
            <div className="glass-card p-6 rounded-2xl flex items-center gap-6 group hover:bg-muted/10 transition-all border-l-4 border-l-emerald-500/40 shadow-lg shadow-emerald-500/5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="font-bold text-lg leading-none mb-1 font-display">Growth</h3>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Savings Rate</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold tracking-tight font-display">{Math.round(growthScore)}</span>
                    <span className="text-[10px] text-muted-foreground font-bold">/100</span>
                  </div>
                </div>
                <div className="w-full bg-muted/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out" style={{ width: `${growthScore}%` }}></div>
                </div>
              </div>
            </div>

            {/* Risk */}
            <div className="glass-card p-6 rounded-2xl flex items-center gap-6 group hover:bg-muted/10 transition-all border-l-4 border-l-rose-500/40 shadow-lg shadow-rose-500/5">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-rose-500" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="font-bold text-lg leading-none mb-1 font-display">Risk</h3>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Concentration</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold tracking-tight font-display">{Math.round(riskScore)}</span>
                    <span className="text-[10px] text-muted-foreground font-bold">/100</span>
                  </div>
                </div>
                <div className="w-full bg-muted/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(riskScore, 100)}%` }}></div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8">
          <div className="glass-card p-6 md:p-8 rounded-3xl bg-primary/5 border-dashed border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-3xl glass-card flex items-center justify-center shadow-2xl shadow-primary/10 border-primary/20 shrink-0">
                <Lightbulb className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Strategic Insight</p>
                <p className="text-xs md:text-sm text-foreground/80 mt-1 leading-relaxed font-medium">
                  {initialData.topExpenseCategories.length > 0
                    ? `Our analysis suggests a ${Math.round(riskScore / 5)}% efficiency gain by reallocating capital from ${initialData.topExpenseCategories[0].category}.`
                    : 'Start tracking expenses to generate strategic audit suggestions.'}
                </p>
              </div>
            </div>
            <button className="w-full md:w-auto text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-8 py-3.5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 relative z-10 whitespace-nowrap">
              {initialData.topExpenseCategories.length > 0 ? 'Optimize Strategy' : 'Audit Data'}
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
