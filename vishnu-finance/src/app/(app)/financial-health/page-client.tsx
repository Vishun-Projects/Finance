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
      <header className="h-16 px-8 flex items-center justify-between border-b border-border shrink-0 bg-background/50 backdrop-blur sticky top-0 z-30">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Financial Health</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full font-bold text-[10px] transition-transform hover:scale-[1.02] active:scale-95 uppercase tracking-wider mr-2">
            <Sparkles className="w-3 h-3" />
            <span>AI Recommendations</span>
          </button>
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
          <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-destructive rounded-full"></span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-12 gap-6">

          {/* Health Score Card */}
          <div className="col-span-12 lg:col-span-5 glass-card p-8 rounded-3xl flex flex-col items-center justify-center text-center bg-card/50">
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground mb-6">Overall Health Score</span>
            <div className="relative flex items-center justify-center w-64 h-64">
              <svg className="w-full h-full -rotate-90">
                <circle className="text-muted/30" cx="128" cy="128" fill="transparent" r="110" stroke="currentColor" strokeWidth="4"></circle>
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
                <span className="text-7xl font-bold tracking-tighter animate-fade-in text-primary">{healthScore}</span>
                <span className="text-xs font-semibold text-muted-foreground mt-2 uppercase tracking-widest">
                  {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Fair'}
                </span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 w-full gap-4 border-t border-border pt-8">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Global Rank</p>
                <p className="text-xl font-bold">Top {healthScore > 80 ? '4%' : healthScore > 60 ? '15%' : '35%'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Peer Avg</p>
                <p className="text-xl font-bold">{PEER_AVG_SCORE}</p>
              </div>
            </div>
          </div>

          {/* Trend Card */}
          <div className="col-span-12 lg:col-span-7 glass-card p-8 rounded-3xl flex flex-col bg-card/50">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.3em]">6 Month Trend</h3>
                <p className="text-2xl font-bold mt-1 text-primary">
                  {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
                </p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${trendPercentage >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
                {trendPercentage >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-primary" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )}
                <span className={`text-xs font-bold ${trendPercentage >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {trendPercentage >= 0 ? 'Improving' : 'Declining'}
                </span>
              </div>
            </div>

            <div className="flex-1 w-full relative min-h-[240px]">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 100">
                <path className="text-primary" d={trendPath} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke"></path>
                <path d={trendAreaPath} fill="url(#gradient)" opacity="0.2"></path>
                <defs>
                  <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop className="text-primary" offset="0%" style={{ stopColor: 'currentColor', stopOpacity: 1 }}></stop>
                    <stop className="text-primary" offset="100%" style={{ stopColor: 'currentColor', stopOpacity: 0 }}></stop>
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex justify-between mt-4 px-1">
                {trendData.map((d, i) => (
                  <span key={i} className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">
                    {d.month.split('-')[1]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.4em]">Detailed Analysis</h3>
            <button className="text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">View History</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Stability */}
            <div className="glass-card p-6 rounded-2xl flex items-center gap-6 group hover:bg-muted/10 transition-colors bg-card/30">
              <div className="w-14 h-14 rounded-2xl bg-muted/20 border border-border flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="font-bold text-lg leading-none mb-1">Stability</h3>
                    <p className="text-xs text-muted-foreground">Debt-to-income ratio analysis</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold tracking-tight">{Math.round(stabilityScore)}</span>
                    <span className="text-xs text-muted-foreground font-medium">/100</span>
                  </div>
                </div>
                <div className="w-full bg-muted/20 h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-500" style={{ width: `${stabilityScore}%` }}></div>
                </div>
              </div>
            </div>

            {/* Growth */}
            <div className="glass-card p-6 rounded-2xl flex items-center gap-6 group hover:bg-muted/10 transition-colors bg-card/30">
              <div className="w-14 h-14 rounded-2xl bg-muted/20 border border-border flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="font-bold text-lg leading-none mb-1">Growth</h3>
                    <p className="text-xs text-muted-foreground">Based on savings rate of {initialData.savingsRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold tracking-tight">{Math.round(growthScore)}</span>
                    <span className="text-xs text-muted-foreground font-medium">/100</span>
                  </div>
                </div>
                <div className="w-full bg-muted/20 h-1 rounded-full overflow-hidden">
                  <div className="bg-foreground h-full transition-all duration-500" style={{ width: `${growthScore}%` }}></div>
                </div>
              </div>
            </div>

            {/* Risk */}
            <div className="glass-card p-6 rounded-2xl flex items-center gap-6 group hover:bg-muted/10 transition-colors bg-card/30">
              <div className="w-14 h-14 rounded-2xl bg-muted/20 border border-border flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="font-bold text-lg leading-none mb-1">Risk</h3>
                    <p className="text-xs text-muted-foreground">Exposure based on expense concentration.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold tracking-tight">{Math.round(riskScore)}</span>
                    <span className="text-xs text-muted-foreground font-medium">/100</span>
                  </div>
                </div>
                <div className="w-full bg-muted/20 h-1 rounded-full overflow-hidden">
                  <div className="bg-foreground h-full transition-all duration-500" style={{ width: `${Math.min(riskScore, 100)}%` }}></div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto p-10 pt-0">
          <div className="glass-card p-8 rounded-3xl bg-muted/5 border-dashed flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI Recommendation</p>
                <p className="text-xs text-muted-foreground">
                  {initialData.topExpenseCategories.length > 0
                    ? `Consider reducing spend in ${initialData.topExpenseCategories[0].category} to improve savings.`
                    : 'Start tracking expenses to get recommendations.'}
                </p>
              </div>
            </div>
            <button className="text-[10px] font-bold uppercase tracking-widest border border-border px-6 py-2.5 rounded-lg hover:bg-foreground hover:text-background transition-all">
              {initialData.topExpenseCategories.length > 0 ? 'Update Strategy' : 'Add Expenses'}
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
