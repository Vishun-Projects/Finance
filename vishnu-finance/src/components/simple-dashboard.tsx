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
import { formatRupees, cn } from '../lib/utils';
import Link from 'next/link';
import FinancialSkeleton from './feedback/financial-skeleton';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export interface SimpleDashboardData {
  totalIncome: number;
  totalExpenses: number;
  totalCredits?: number;
  totalDebits?: number;
  netSavings: number;
  savingsRate: number;
  totalNetWorth: number;
  totalTransactionsCount?: number;
  upcomingDeadlines: number;
  activeGoals: number;
  topPayees?: Array<{ name: string; amount: number; count: number }>;
  dynamicInsights?: Array<{ type: 'pattern' | 'warning' | 'positive'; message: string }>;
  recentTransactions: Array<{
    id: string;
    title: string;
    amount: number;
    type: 'income' | 'expense' | 'credit' | 'debit';
    category: string;
    date: string;
    financialCategory?: string;
    store?: string | null;
    personName?: string | null;
  }>;
  financialHealthScore: number;
  currentMonthStats: {
    income: number;
    expenses: number;
    netFlow: number;
  };
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

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(initialStartDate || defaultStart);
  const [endDate, setEndDate] = useState(initialEndDate || defaultEnd);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Analytics' | 'Logs'>('Overview');

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id || authLoading) return;
    setIsLoading(true);
    try {
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
  }, [user?.id, authLoading, startDate, endDate]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, fetchDashboardData]);

  const netWorth = useMemo(() => dashboardData?.totalNetWorth ?? dashboardData?.netSavings ?? 0, [dashboardData]);
  const filteredIncome = useMemo(() => dashboardData?.totalIncome ?? 0, [dashboardData]);
  const filteredExpenses = useMemo(() => dashboardData?.totalExpenses ?? 0, [dashboardData]);
  const netFlow = useMemo(() => (dashboardData?.currentMonthStats?.netFlow ?? (filteredIncome - filteredExpenses)), [dashboardData, filteredIncome, filteredExpenses]);

  const chartData = useMemo(() => dashboardData?.monthlyTrends.map(item => ({
    name: item.month,
    credits: item.credits || item.income,
    debits: item.debits || item.expenses
  })) || [], [dashboardData]);

  if (authLoading || (isLoading && !dashboardData)) {
    return <FinancialSkeleton />;
  }

  if (!dashboardData) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-none">
      <header className="h-10 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="size-5 bg-foreground flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-background" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground leading-none">
              Financial_Audit_System_v2.0
            </h2>
          </div>
          <div className="h-4 w-[1px] bg-border mx-2" />
          <nav className="flex items-center gap-6">
            {(['Overview', 'Analytics', 'Logs'] as const).map(tab => (
              <span 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest cursor-pointer transition-none",
                  activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center bg-muted/20 border-x border-border h-10 px-4 gap-3 group">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[9px] font-black text-foreground focus:outline-none cursor-pointer uppercase tracking-widest numeric"
            />
            <span className="text-muted-foreground/30 font-black text-[9px]">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[9px] font-black text-foreground focus:outline-none cursor-pointer uppercase tracking-widest numeric"
            />
          </div>

          <div className="flex items-center gap-4 px-2">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="text-muted-foreground hover:text-foreground transition-none"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <div className="size-6 bg-muted/40 border border-border flex items-center justify-center">
              <Bell className="w-3 h-3 text-muted-foreground" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-none w-full border-x border-border bg-background">
        <section className="grid grid-cols-1 md:grid-cols-4 border-b border-border">
          <div className="p-4 border-r border-border flex flex-col justify-between">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Capital_Position</span>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tabular-nums numeric tracking-tighter">{formatRupees(netWorth).split('.')[0]}</span>
                <span className="text-[8px] font-black text-muted-foreground/40 uppercase">INR</span>
              </div>
              <p className="text-[8px] font-bold mt-1 uppercase tracking-widest text-emerald-500">
                + {dashboardData.savingsRate.toFixed(1)}% EFC_ADJUSTED
              </p>
            </div>
          </div>

          <div className="p-4 border-r border-border flex flex-col justify-between bg-muted/5">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Tactical_Runway</span>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tabular-nums numeric tracking-tighter">
                  {filteredExpenses > 0 ? Math.floor(netWorth / (filteredExpenses || 1)) : 'INF'}
                </span>
                <span className="text-[8px] font-black text-muted-foreground/40 uppercase">Months</span>
              </div>
              <div className="w-full bg-border h-0.5 mt-2">
                <div 
                  className="bg-foreground h-full" 
                  style={{ width: `${Math.min(100, (netWorth / (filteredExpenses * 12 || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-r border-border">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Flow_Audit_Snapshot</span>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Inflow</span>
                <span className="text-sm font-black text-emerald-500 tabular-nums numeric">{formatRupees(filteredIncome).split('.')[0]}</span>
              </div>
              <div>
                <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Outflow</span>
                <span className="text-sm font-black text-rose-500 tabular-nums numeric">{formatRupees(filteredExpenses).split('.')[0]}</span>
              </div>
            </div>
          </div>

          <div className="p-4 flex flex-col justify-between bg-primary/[0.02]">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary mb-4">Net_Yield</span>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-black tabular-nums numeric tracking-tighter ${netFlow >= 0 ? 'text-foreground' : 'text-rose-600'}`}>
                {netFlow > 0 ? '+' : ''}{formatRupees(netFlow).split('.')[0]}
              </span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
          </div>
        </section>

        {activeTab === 'Overview' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            <div className="lg:col-span-8 flex flex-col border-r border-border">
              <div className="p-6 border-b border-border bg-muted/5 h-[320px]">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground">Spectral_Flow_Dynamics</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-foreground">
                      <div className="size-1.5 bg-foreground" /> Inbound
                    </div>
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">
                      <div className="size-1.5 border border-border" /> Outbound
                    </div>
                  </div>
                </div>
                <div className="h-[200px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" hide />
                        <Area
                          type="monotone"
                          dataKey="credits"
                          stroke="currentColor"
                          strokeWidth={1}
                          fill="currentColor"
                          fillOpacity={0.05}
                        />
                        <Area
                          type="monotone"
                          dataKey="debits"
                          stroke="currentColor"
                          strokeWidth={1}
                          fill="none"
                          opacity={0.1}
                          strokeDasharray="2 2"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest opacity-20">No_Data_Series</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 border-b border-border bg-muted/10">
                {[
                  { label: 'Salary', icon: Wallet, href: '/salary' },
                  { label: 'Activity', icon: ArrowDown, href: '/transactions' },
                  { label: 'Plans', icon: Target, href: '/plans' },
                  { label: 'Deadlines', icon: CalendarClock, href: '/deadlines' },
                  { label: 'Wishlist', icon: Star, href: '/wishlist' },
                  { label: 'Advisor', icon: Sun, href: '/advisor' },
                ].map((item, i) => (
                  <Link 
                    key={i} 
                    href={item.href} 
                    className="px-4 py-3 border-r border-border hover:bg-foreground hover:text-background transition-none flex flex-col gap-2 group"
                  >
                    <item.icon className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                    <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse industrial-grid">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 sticky top-0 z-10">
                      <th className="px-4 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground border-r border-border">ID_Entity</th>
                      <th className="px-4 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground border-r border-border text-right">Value_INR</th>
                      <th className="px-4 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground border-r border-border text-center">Sector</th>
                      <th className="px-4 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {dashboardData.recentTransactions.slice(0, 15).map((tx) => {
                      const isIncome = tx.type === 'income' || tx.type === 'credit';
                      return (
                        <tr key={tx.id} className="hover:bg-muted/30 transition-none group">
                          <td className="px-4 py-2 border-r border-border">
                            <span className="text-[10px] font-black uppercase tracking-tight text-foreground truncate block max-w-[200px]">
                              {tx.store || tx.personName || tx.title}
                            </span>
                          </td>
                          <td className="px-4 py-2 border-r border-border text-right">
                            <span className={cn("text-[10px] font-black tabular-nums numeric", isIncome ? "text-emerald-500" : "text-foreground")}>
                              {isIncome ? '+' : '-'}{formatRupees(Math.abs(tx.amount)).split('.')[0]}
                            </span>
                          </td>
                          <td className="px-4 py-2 border-r border-border text-center">
                            <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">{tx.category || 'NA'}</span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground numeric">
                              {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-4 bg-muted/5 flex flex-col">
              <div className="p-6 border-b border-border">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground mb-6">Processed_Insights</h3>
                <div className="space-y-8">
                  {dashboardData.dynamicInsights && dashboardData.dynamicInsights.length > 0 ? (
                    dashboardData.dynamicInsights.map((insight, idx) => (
                      <div key={idx} className={cn(
                        "p-4 border border-border bg-background",
                        insight.type === 'warning' ? "border-rose-500/20" : 
                        insight.type === 'positive' ? "border-emerald-500/20" : ""
                      )}>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest block mb-2",
                          insight.type === 'warning' ? "text-rose-500" : 
                          insight.type === 'positive' ? "text-emerald-500" : "text-primary"
                        )}>
                          {insight.type === 'warning' ? 'Audit_Advisory' : 
                           insight.type === 'positive' ? 'Capital_Yield' : 'Flow_Pattern'}
                        </span>
                        <p className="text-[10px] font-bold leading-relaxed text-foreground/80 uppercase">
                          {insight.message}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 border border-border bg-background">
                      <span className="text-[8px] font-black uppercase tracking-widest text-primary block mb-2">System_Status</span>
                      <p className="text-[10px] font-bold leading-relaxed text-foreground/80 uppercase">
                        Nominal flow patterns detected. Synchronizing audit metadata...
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block">Top_Payees</span>
                    <div className="space-y-3">
                      {dashboardData.topPayees && dashboardData.topPayees.length > 0 ? (
                        dashboardData.topPayees.map((payee, i) => (
                          <div key={i}>
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-[9px] font-black uppercase tracking-tight text-foreground truncate max-w-[140px]">{payee.name}</span>
                              <span className="text-[9px] font-black tabular-nums numeric text-muted-foreground">{formatRupees(payee.amount).split('.')[0]}</span>
                            </div>
                            <div className="w-full bg-border h-[1px]">
                              <div 
                                className="bg-foreground/40 h-full" 
                                style={{ width: `${Math.min(100, (payee.amount / (dashboardData.totalExpenses || 1)) * 100)}%` }} 
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[9px] font-black text-muted-foreground/30 uppercase">Insufficient_Payee_Metadata</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-border bg-background">
                      <span className="text-[7px] font-black text-muted-foreground uppercase block mb-1">Active_Goals</span>
                      <span className="text-lg font-black numeric">{dashboardData.activeGoals}</span>
                    </div>
                    <div className="p-4 border border-border bg-background">
                      <span className="text-[7px] font-black text-muted-foreground uppercase block mb-1">Deadlines</span>
                      <span className="text-lg font-black numeric text-rose-500">{dashboardData.upcomingDeadlines}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 flex flex-col justify-end">
                 <div className="p-4 border border-border bg-emerald-500/5">
                   <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 block mb-2">Audit_Safe_Zone</span>
                   <p className="text-[10px] font-bold leading-relaxed text-foreground/80 uppercase">
                     Financial telemetry indicates structural stability. No immediate risk vectors detected in current flow patterns.
                   </p>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Analytics' && (
          <div className="flex-1 overflow-auto p-6 bg-background space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sector Concentration */}
              <div className="border border-border p-6 bg-muted/5">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-6">Sector_Concentration_Audit</h4>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.categoryBreakdown}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', fontSize: '10px' }}
                        itemStyle={{ color: 'var(--foreground)' }}
                        cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
                      />
                      <Bar dataKey="amount" fill="var(--primary)" opacity={0.6} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 mt-4">
                  {dashboardData.categoryBreakdown.slice(0, 4).map((cat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="size-1 bg-foreground" />
                      <span className="text-[8px] font-black uppercase tracking-widest">{cat.name}: {formatRupees(cat.amount).split('.')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Savings Efficiency */}
              <div className="border border-border p-6 bg-muted/5 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-6">Capital_Efficiency_Metric</h4>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Savings_Rate</span>
                    <span className="text-2xl font-black numeric">{dashboardData.savingsRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-border h-3 mb-8">
                    <div 
                      className={cn("h-full", dashboardData.savingsRate > 20 ? "bg-emerald-500" : "bg-primary")} 
                      style={{ width: `${Math.min(100, dashboardData.savingsRate)}%` }} 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 border border-border bg-background">
                     <span className="text-[7px] font-black text-muted-foreground uppercase block mb-1">Monthly_Yield</span>
                     <span className="text-xl font-black numeric">{formatRupees(dashboardData.currentMonthStats.netFlow).split('.')[0]}</span>
                   </div>
                   <div className="p-4 border border-border bg-background">
                     <span className="text-[7px] font-black text-muted-foreground uppercase block mb-1">Inbound_Velocity</span>
                     <span className="text-xl font-black numeric text-emerald-500">+{formatRupees(dashboardData.currentMonthStats.income / 30).split('.')[0]}/D</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Income-Expense Velocity Chart */}
            <div className="border border-border p-6 bg-muted/5">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-6">Structural_Burn_Velocity</h4>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <XAxis dataKey="name" hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', fontSize: '10px' }}
                    />
                    <Area type="monotone" dataKey="credits" stroke="var(--emerald-500)" fill="var(--emerald-500)" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="debits" stroke="var(--rose-500)" fill="var(--rose-500)" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-emerald-500/20 border border-emerald-500" />
                   <span className="text-[8px] font-black uppercase tracking-widest">Inbound_Flow</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-rose-500/20 border border-rose-500" />
                   <span className="text-[8px] font-black uppercase tracking-widest">Outbound_Pressure</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Logs' && (
          <div className="flex-1 p-0 flex flex-col overflow-hidden font-mono">
            <div className="h-10 px-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">SYSTEM_TELEMETRY_LOGS</h2>
              <span className="text-[9px] text-muted-foreground/50">REAL-TIME FEED</span>
            </div>
            <div className="flex-1 overflow-auto p-4 text-[10px] space-y-2">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="flex gap-4 border-b border-border/5 pb-2">
                  <span className="text-muted-foreground/30">[{new Date().toISOString()}]</span>
                  <span className="text-emerald-500/80 font-bold">INFO</span>
                  <span className="text-foreground/60 tracking-tight">TRX_SYNC_PROCESS_NODE_{Math.floor(Math.random() * 9000) + 1000} :: SUCCESS [200 OK]</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
