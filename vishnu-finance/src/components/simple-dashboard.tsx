'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Bell,
  ArrowDown,
  ArrowUp,
  TrendingUp,
  ShoppingBag,
  Plus,
  Sun,
  Moon,
  Wallet,
  CalendarClock,
  Star,
  Target,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatRupees } from '../lib/utils';
import Link from 'next/link';
import PageSkeleton from './page-skeleton';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis
} from 'recharts';

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
    return <PageSkeleton />;
  }

  if (!dashboardData) return null;

  // Derived Data
  const netWorth = dashboardData.totalNetWorth ?? dashboardData.netSavings; // Use totalNetWorth if available
  const monthlyIncome = dashboardData.totalIncome;
  const monthlyExpenses = dashboardData.totalExpenses;
  const netFlow = monthlyIncome - monthlyExpenses;

  // ... rest of chart logic ...

  // Chart Data Preparation
  const chartData = dashboardData.monthlyTrends.map(item => ({
    name: item.month,
    credits: item.credits || item.income,
    debits: item.debits || item.expenses
  }));

  // Chart Colors using CSS Variables
  // Chart Colors using CSS Variables
  const creditsColor = 'hsl(var(--chart-1))'; // Primary (Gold/Blue/etc)
  const debitsColor = 'hsl(var(--chart-2))';  // Accent

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-display transition-colors duration-300">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-8 shrink-0 bg-background/50 backdrop-blur sticky top-0 z-30">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hidden md:block">Dashboard</h2>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2 mr-auto md:mr-0 md:ml-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-card border border-border text-foreground text-[10px] rounded px-2 py-1 focus:outline-none focus:border-foreground/50 uppercase tracking-wider font-bold"
          />
          <span className="text-muted-foreground text-[10px]">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-card border border-border text-foreground text-[10px] rounded px-2 py-1 focus:outline-none focus:border-foreground/50 uppercase tracking-wider font-bold"
          />
        </div>

        <div className="flex items-center gap-4 ml-4">
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
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      {/* Content */}
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Net Worth Card */}
        <section className="glass-card rounded-2xl p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative overflow-hidden group">
          {/* Background Glow Effect - Visible mainly in dark mode */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-colors duration-700 pointer-events-none"></div>

          <div className="relative z-10">
            <p className="text-muted-foreground text-sm font-medium mb-2 uppercase tracking-wide">Total Net Worth</p>
            <h1 className="text-5xl font-bold tracking-tight text-primary tabular-nums">
              {formatRupees(netWorth)}
            </h1>
            <div className="flex items-center gap-3 mt-4">
              <span className="bg-foreground/10 text-foreground text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +{dashboardData.savingsRate.toFixed(1)}% THIS MONTH
              </span>
              <span className="text-muted-foreground text-xs">Updated just now</span>
            </div>
          </div>
          <div className="flex gap-4 relative z-10">
            <button className="border border-border text-foreground px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-foreground/5 transition-all">Export Report</button>
          </div>
        </section>

        {/* KPI Cards Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Salary Card */}
          <Link href="/salary" className="group">
            <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:bg-accent/30 transition-all duration-300 h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Salary</span>
              </div>
              {dashboardData.salaryInfo ? (
                <>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                    {formatRupees(dashboardData.salaryInfo.takeHome)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    CTC: {formatRupees(dashboardData.salaryInfo.ctc)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No salary set</p>
              )}
            </div>
          </Link>

          {/* Transactions Card */}
          <Link href="/transactions" className="group">
            <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:bg-accent/30 transition-all duration-300 h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ArrowDown className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transactions</span>
              </div>
              <p className="text-xl font-bold tabular-nums">
                {formatRupees(dashboardData.totalDebits || dashboardData.totalExpenses)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                In: {formatRupees(dashboardData.totalCredits || dashboardData.totalIncome)}
              </p>
            </div>
          </Link>

          {/* Savings Rate Card */}
          <div className="bg-card border border-border rounded-xl p-4 h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Savings</span>
            </div>
            <p className={`text-xl font-bold tabular-nums ${dashboardData.savingsRate >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {dashboardData.savingsRate.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {formatRupees(dashboardData.netSavings)} saved
            </p>
          </div>

          {/* Plans Card - Enhanced */}
          <Link href="/plans" className="group">
            <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:bg-accent/30 transition-all duration-300 h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-purple-500" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plans</span>
                </div>
                <span className="text-lg font-bold text-purple-500">{dashboardData.plansInfo?.activePlans || 0}</span>
              </div>
              {dashboardData.plansInfo?.items && dashboardData.plansInfo.items.length > 0 ? (
                (() => {
                  const topPlan = dashboardData.plansInfo.items[0];
                  const progress = topPlan.targetAmount > 0
                    ? Math.min(100, Math.round((topPlan.currentAmount / topPlan.targetAmount) * 100))
                    : 0;
                  const otherCount = (dashboardData.plansInfo.activePlans || 0) - 1;

                  return (
                    <div className="space-y-3 mt-1">
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Immediate Goal</div>
                          <div className="font-bold text-sm truncate max-w-[120px]">{topPlan.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-purple-500">{progress}%</div>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{formatRupees(topPlan.currentAmount)}</span>
                        <span>{formatRupees(topPlan.targetAmount)}</span>
                      </div>
                      {otherCount > 0 && (
                        <p className="text-[10px] text-muted-foreground text-right pt-1 border-t border-border/50">
                          +{otherCount} other plan{otherCount !== 1 ? 's' : ''} active
                        </p>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-[11px] text-muted-foreground">No active plans</p>
              )}
            </div>
          </Link>

          {/* Deadlines Card - Enhanced */}
          <Link href="/deadlines" className="group">
            <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:bg-accent/30 transition-all duration-300 h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <CalendarClock className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deadlines</span>
                </div>
                <span className="text-lg font-bold text-orange-500">{dashboardData.deadlinesInfo?.upcoming || dashboardData.upcomingDeadlines}</span>
              </div>
              {dashboardData.deadlinesInfo?.items && dashboardData.deadlinesInfo.items.length > 0 ? (
                <ul className="space-y-1.5 text-[11px]">
                  {dashboardData.deadlinesInfo.items.slice(0, 3).map((deadline, i) => (
                    <li key={i} className="flex justify-between items-center">
                      <span className="truncate max-w-[90px] text-foreground">{deadline.title}</span>
                      <span className="text-muted-foreground tabular-nums">{new Date(deadline.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">No upcoming</p>
              )}
            </div>
          </Link>

          {/* Wishlist Card - Enhanced */}
          <Link href="/wishlist" className="group">
            <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:bg-accent/30 transition-all duration-300 h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Star className="w-4 h-4 text-yellow-500" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Wishlist</span>
                </div>
                <span className="text-lg font-bold text-yellow-500">{dashboardData.wishlistInfo?.totalItems || 0}</span>
              </div>
              {dashboardData.wishlistInfo?.items && dashboardData.wishlistInfo.items.length > 0 ? (
                <ul className="space-y-1.5 text-[11px]">
                  {dashboardData.wishlistInfo.items.slice(0, 3).map((item, i) => (
                    <li key={i} className="flex justify-between items-center">
                      <span className="truncate max-w-[90px] text-foreground">{item.name}</span>
                      <span className="text-muted-foreground tabular-nums">{formatRupees(item.estimatedPrice)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">No items</p>
              )}
            </div>
          </Link>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-8 bg-card border border-border rounded-xl p-6 relative transition-colors duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Credits vs Debits</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: creditsColor }}></span>
                  <span className="text-[10px] font-bold text-muted-foreground">CREDITS</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: debitsColor }}></span>
                  <span className="text-[10px] font-bold text-muted-foreground">DEBITS</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              {chartData.length === 0 ? (
                <div className="text-muted-foreground text-xs uppercase tracking-widest font-bold opacity-50">
                  No trend data available for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={creditsColor} stopOpacity={0.1} />
                        <stop offset="95%" stopColor={creditsColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={10}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      itemStyle={{
                        color: 'hsl(var(--foreground))',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="credits"
                      stroke={creditsColor}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCredits)"
                    />
                    <Area
                      type="monotone"
                      dataKey="debits"
                      stroke={debitsColor}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fill="none"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Cashflow Snapshot */}
          <div className="lg:col-span-4 bg-card border border-border rounded-xl p-6 flex flex-col justify-between transition-colors duration-300">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">Cashflow Snapshot</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center group">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Monthly Income</p>
                  <p className="text-xl font-bold tabular-nums text-foreground">{formatRupees(monthlyIncome)}</p>
                </div>
                <ArrowDown className="text-foreground opacity-20 group-hover:opacity-100 transition-opacity w-5 h-5 rotate-180" />
              </div>
              <div className="w-full h-px bg-border"></div>
              <div className="flex justify-between items-center group">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Monthly Spends</p>
                  <p className="text-xl font-bold tabular-nums text-foreground">{formatRupees(monthlyExpenses)}</p>
                </div>
                <ArrowUp className="text-foreground opacity-20 group-hover:opacity-100 transition-opacity w-5 h-5" />
              </div>
              <div className="w-full h-px bg-border"></div>
              <div className="bg-foreground/5 p-4 rounded-lg flex justify-between items-center border border-foreground/5">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Net Flow</p>
                  <p className={`text-xl font-bold tabular-nums ${netFlow >= 0 ? 'text-foreground' : 'text-red-400'}`}>
                    {netFlow > 0 ? '+' : ''}{formatRupees(netFlow)}
                  </p>
                </div>
                <div className="size-8 rounded-full bg-foreground flex items-center justify-center">
                  <TrendingUp className="text-background w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <section className="space-y-4 pb-12">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent Activity</h3>
            <Link href="/transactions">
              <button className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">VIEW ALL TRANSACTIONS</button>
            </Link>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden transition-colors duration-300">
            {/* Desktop Table View */}
            <table className="w-full text-left hidden md:table">
              <thead className="bg-foreground/[0.02] border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dashboardData.recentTransactions.slice(0, 5).map((tx) => (
                  <tr key={tx.id} className="hover:bg-foreground/[0.02] transition-colors cursor-pointer group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded border border-border flex items-center justify-center bg-muted">
                          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground max-w-[200px] truncate">{tx.store || tx.title}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider bg-foreground text-background">
                        {tx.category || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-foreground"></div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Completed</span>
                      </div>
                    </td>
                    <td className={`px-6 py-5 text-right font-bold tabular-nums ${tx.type === 'income' || tx.type === 'credit' ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                      {tx.type === 'income' || tx.type === 'credit' ? '+' : '-'}{formatRupees(Math.abs(tx.amount))}
                    </td>
                  </tr>
                ))}
                {dashboardData.recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground text-sm">
                      No recent transactions found. Add your first one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border">
              {dashboardData.recentTransactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="p-4 hover:bg-foreground/[0.02] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded border border-border flex items-center justify-center bg-muted shrink-0">
                        <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground line-clamp-1">{tx.store || tx.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">
                          {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {tx.category || 'General'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold tabular-nums ${tx.type === 'income' || tx.type === 'credit' ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                        {tx.type === 'income' || tx.type === 'credit' ? '+' : '-'}{formatRupees(Math.abs(tx.amount))}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="size-1.5 rounded-full bg-foreground"></span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Done</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {dashboardData.recentTransactions.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No recent transactions found.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
