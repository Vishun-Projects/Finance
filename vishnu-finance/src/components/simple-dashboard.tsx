'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  ArrowDown,
  ArrowUp,
  TrendingUp,
  ShoppingBag,
  Sun,
  Moon,
  Wallet,
  CalendarClock,
  Star,
  Target
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatRupees } from '../lib/utils';
import Link from 'next/link';
import FinancialSkeleton from './feedback/financial-skeleton';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis
} from 'recharts';
import { DailyQuoteCard } from './dashboard/daily-quote';

export interface SimpleDashboardData {
  totalIncome: number;
  totalExpenses: number;
  totalCredits?: number;
  totalDebits?: number;
  netSavings: number;
  savingsRate: number;
  totalNetWorth: number;
  upcomingDeadlines: number;
  activeGoals: number;
  recentTransactions: Array<{
    id: string;
    title: string;
    amount: number;
    type: 'income' | 'expense' | 'credit' | 'debit';
    category: string;
    date: string;
    financialCategory?: string;
    store?: string | null;
  }>;
  financialHealthScore: number;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
    credits?: number;
    debits?: number;
  }>;
  categoryBreakdown: Array<{
    name: string;
    amount: number;
  }>;
  // NEW: Additional KPI data
  salaryInfo?: {
    takeHome: number;
    ctc: number;
    jobTitle: string;
    company: string;
  } | null;
  plansInfo?: {
    activePlans: number;
    totalCommitted: number;
    topPlan: string | null;
    items?: Array<{ name: string; targetAmount: number; currentAmount: number; priority?: number }>;
  };
  wishlistInfo?: {
    totalItems: number;
    totalCost: number;
    topItem: string | null;
    items?: Array<{ name: string; estimatedPrice: number; priority?: number }>;
  };
  deadlinesInfo?: {
    upcoming: number;
    nextDeadline: { title: string; dueDate: string } | null;
    items?: Array<{ title: string; dueDate: string }>;
  };
}

// Offline cache helpers (omit implementation for brevity as it is unchanged)
const CACHE_KEY = 'dashboard_cache';
const CACHE_TIMESTAMP_KEY = 'dashboard_cache_timestamp';

async function getCachedDashboard(): Promise<SimpleDashboardData | null> {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < 60 * 60 * 1000) return JSON.parse(cached);
    }
  } catch (e) { console.error(e); }
  return null;
}

async function setCachedDashboard(data: SimpleDashboardData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) { console.error(e); }
}

interface SimpleDashboardProps {
  initialData?: SimpleDashboardData | null;
  initialStartDate?: string;
  initialEndDate?: string;
}

export default function SimpleDashboard({
  initialData = null,
  initialStartDate,
  initialEndDate,
}: SimpleDashboardProps) {
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const [dashboardData, setDashboardData] = useState<SimpleDashboardData | null>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);

  // Date Range State
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(initialStartDate || defaultStart);
  const [endDate, setEndDate] = useState(initialEndDate || defaultEnd);

  // Fetch logic
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id || authLoading) return;
    setIsLoading(true);
    try {
      // Create Query Params
      const params = new URLSearchParams({ userId: user.id });
      if (startDate) params.append('start', startDate);
      if (endDate) params.append('end', endDate);

      const response = await fetch(`/api/dashboard-simple?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        await setCachedDashboard(data);
      }
    } catch (e) {
      console.error('Fetch error', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, authLoading, startDate, endDate]); // Re-fetch when dates change

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, fetchDashboardData]);

  // Loading State
  if (authLoading || (isLoading && !dashboardData)) {
    return <FinancialSkeleton />;
  }

  if (!dashboardData) return null;

  // Derived Data
  const netWorth = useMemo(() => dashboardData.totalNetWorth ?? dashboardData.netSavings, [dashboardData.totalNetWorth, dashboardData.netSavings]);
  const monthlyIncome = useMemo(() => dashboardData.totalIncome, [dashboardData.totalIncome]);
  const monthlyExpenses = useMemo(() => dashboardData.totalExpenses, [dashboardData.totalExpenses]);
  const netFlow = useMemo(() => monthlyIncome - monthlyExpenses, [monthlyIncome, monthlyExpenses]);

  // Chart Data Preparation
  const chartData = useMemo(() => dashboardData.monthlyTrends.map(item => ({
    name: item.month,
    credits: item.credits || item.income,
    debits: item.debits || item.expenses
  })), [dashboardData.monthlyTrends]);

  // Chart Colors using CSS Variables
  const creditsColor = 'hsl(var(--chart-1))'; // Primary (Gold/Blue/etc)
  const debitsColor = 'hsl(var(--chart-2))';  // Accent

  // ... (previous imports and logic remains same until return)

  return (
    <div className="flex flex-col min-h-full bg-background text-foreground font-sans transition-colors duration-300">
      {/* Header - Glassmorphism, Sticky */}
      <header className="h-16 border-b border-border/40 flex items-center justify-between px-4 md:px-8 shrink-0 bg-background/80 backdrop-blur-xl sticky top-0 z-40 transition-all">
        <h2 className="text-sm font-display font-medium tracking-wide text-muted-foreground hidden md:block">
          Overview
        </h2>

        {/* Date Controls - Minimal */}
        <div className="flex items-center gap-2 mr-auto md:mr-0 md:ml-auto bg-muted/30 p-1 rounded-lg border border-border/20">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-[10px] md:text-xs font-medium text-foreground px-2 py-1 rounded focus:outline-none focus:bg-background transition-colors cursor-pointer uppercase tracking-wider"
          />
          <span className="text-muted-foreground/50 text-[10px]">•</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-[10px] md:text-xs font-medium text-foreground px-2 py-1 rounded focus:outline-none focus:bg-background transition-colors cursor-pointer uppercase tracking-wider"
          />
        </div>

        {/* Action Buttons - Minimal Icons */}
        <div className="flex items-center gap-3 ml-4">
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-display font-medium text-foreground tracking-tight mb-2">
              Financial Health
            </h1>
            <p className="text-muted-foreground text-sm md:text-base font-light max-w-2xl">
              Your net worth is tracking <span className={dashboardData.savingsRate >= 0 ? "text-emerald-500 font-medium" : "text-rose-500 font-medium"}>{dashboardData.savingsRate >= 0 ? 'upwards' : 'downwards'}</span> this month.
              Keep pushing towards your goals.
            </p>
          </div>
          <div className="lg:col-span-4">
            <DailyQuoteCard />
          </div>
        </div>

        {/* Net Worth & Key Stats - Glass Panels */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Net Worth - Featured */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 rounded-2xl p-6 bg-card/40 backdrop-blur-md border border-border/50 relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-2 block">Net Worth</span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-4xl md:text-5xl font-display font-medium text-foreground tabular-nums tracking-tight">
                  {formatRupees(netWorth)}
                </h2>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${dashboardData.savingsRate >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                  <TrendingUp className="w-3 h-3" />
                  {Math.abs(dashboardData.savingsRate).toFixed(1)}%
                </div>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Savings Rate</span>
              </div>
            </div>

            {/* Subtle background decoration */}
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-foreground/5 rounded-full blur-3xl pointer-events-none group-hover:bg-foreground/10 transition-colors duration-500" />
          </div>

          {/* Monthly In/Out */}
          <div className="rounded-2xl p-6 bg-card/40 backdrop-blur-md border border-border/50 flex flex-col justify-between group hover:border-border/80 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ArrowDown className="w-4 h-4" />
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Income</span>
              <p className="text-2xl font-display font-medium text-foreground mt-1 tabular-nums">{formatRupees(monthlyIncome)}</p>
            </div>
          </div>

          <div className="rounded-2xl p-6 bg-card/40 backdrop-blur-md border border-border/50 flex flex-col justify-between group hover:border-border/80 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ArrowUp className="w-4 h-4" />
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Expenses</span>
              <p className="text-2xl font-display font-medium text-foreground mt-1 tabular-nums">{formatRupees(monthlyExpenses)}</p>
            </div>
          </div>
        </section>

        {/* Quick Access Grid - Minimal Cards */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {[
            {
              label: 'Salary',
              icon: Wallet,
              href: '/salary',
              value: dashboardData.salaryInfo ? formatRupees(dashboardData.salaryInfo.takeHome) : 'N/A',
              subtext: 'Monthly',
              color: 'text-indigo-500'
            },
            {
              label: 'Transactions',
              icon: ArrowDown,
              href: '/transactions',
              value: formatRupees(dashboardData.totalDebits || dashboardData.totalExpenses),
              subtext: 'Spent',
              color: 'text-blue-500'
            },
            {
              label: 'Plans',
              icon: Target,
              href: '/plans',
              value: dashboardData.plansInfo?.activePlans?.toString() || '0',
              subtext: 'Active',
              color: 'text-purple-500'
            },
            {
              label: 'Deadlines',
              icon: CalendarClock,
              href: '/deadlines',
              value: dashboardData.deadlinesInfo?.upcoming?.toString() || '0',
              subtext: 'Upcoming',
              color: 'text-orange-500'
            },
            {
              label: 'Wishlist',
              icon: Star,
              href: '/wishlist',
              value: dashboardData.wishlistInfo?.totalItems?.toString() || '0',
              subtext: 'Items',
              color: 'text-yellow-500'
            },
            {
              label: 'Savings',
              icon: TrendingUp,
              href: '/financial-health',
              value: formatRupees(dashboardData.netSavings),
              subtext: 'Saved',
              color: 'text-emerald-500'
            },
          ].map((item, i) => (
            <Link href={item.href} key={i} className="group">
              <div className="h-full bg-card/30 border border-border/40 rounded-xl p-4 hover:bg-card/60 hover:border-primary/20 transition-all duration-300 flex flex-col justify-between backdrop-blur-sm">
                <div className="flex justify-between items-start mb-2">
                  <item.icon className={`w-4 h-4 ${item.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                </div>
                <div>
                  <p className="text-lg font-display font-medium text-foreground tabular-nums leading-tight">{item.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 group-hover:text-foreground/70 transition-colors">{item.label}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* Chart */}
          <div className="lg:col-span-8 bg-card/30 border border-border/40 rounded-2xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cashflow Trend</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground/80">
                  <span className="w-2 h-2 rounded-full bg-foreground/80" /> Credit
                </div>
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground/80">
                  <span className="w-2 h-2 rounded-full border border-foreground/50" /> Debit
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              {chartData.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">
                  No Data Available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="credits"
                      stroke="hsl(var(--foreground))"
                      strokeWidth={2}
                      fill="url(#chartGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="debits"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fill="none"
                      opacity={0.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Cashflow Summary - Minimal List */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">This Month</h3>

            <div className="bg-card/30 border border-border/40 rounded-2xl p-0 backdrop-blur-md overflow-hidden">
              <div className="p-5 flex items-center justify-between border-b border-border/40 hover:bg-muted/10 transition-colors">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Income</p>
                  <p className="text-lg font-display font-medium">{formatRupees(monthlyIncome)}</p>
                </div>
                <ArrowDown className="w-5 h-5 text-emerald-500 opacity-80" />
              </div>
              <div className="p-5 flex items-center justify-between border-b border-border/40 hover:bg-muted/10 transition-colors">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Spends</p>
                  <p className="text-lg font-display font-medium">{formatRupees(monthlyExpenses)}</p>
                </div>
                <ArrowUp className="w-5 h-5 text-rose-500 opacity-80" />
              </div>
              <div className="p-5 flex items-center justify-between bg-foreground/5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Net Flow</p>
                  <p className={`text-xl font-display font-medium ${netFlow >= 0 ? 'text-foreground' : 'text-rose-500'}`}>
                    {netFlow > 0 ? '+' : ''}{formatRupees(netFlow)}
                  </p>
                </div>
                <Wallet className="w-5 h-5 text-foreground opacity-80" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions List - Clean */}
        <div className="space-y-4 pb-8">
          <div className="flex justify-between items-end border-b border-border/40 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent Activity</h3>
            <Link href="/transactions" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">
              View All →
            </Link>
          </div>

          <div className="bg-card/30 border border-border/40 rounded-2xl backdrop-blur-md overflow-hidden">
            {dashboardData.recentTransactions.length > 0 ? (
              <div className="divide-y divide-border/40">
                {dashboardData.recentTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground group-hover:border-foreground/30 transition-all">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{tx.store || tx.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/80">{tx.category || 'General'}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-[10px] text-muted-foreground">{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold tabular-nums ${tx.type === 'income' || tx.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                        }`}>
                        {tx.type === 'income' || tx.type === 'credit' ? '+' : '-'}{formatRupees(Math.abs(tx.amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No recent transactions</p>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
