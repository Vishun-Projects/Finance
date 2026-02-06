'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  Wallet,
  Target,
  CalendarClock,
  Star,
  ShoppingBag,
  MoreHorizontal,
  ArrowRight,
  TrendingDown,
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatRupees, cn } from '@/lib/utils';
import Link from 'next/link';
import FinancialSkeleton from '@/components/feedback/financial-skeleton';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import type { SimpleDashboardData } from '@/components/simple-dashboard';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import type { DateRange } from 'react-day-picker';

// --- Local Components for Bento Grid ---

const BentoCard = ({ children, className = '', title, icon: Icon, action }: { 
  children: React.ReactNode; 
  className?: string;
  title?: string;
  icon?: any;
  action?: React.ReactNode;
}) => {
  return (
    <div className={cn(
        "bg-card/50 backdrop-blur-md border border-border/50 rounded-[2.5rem] p-8 flex flex-col transition-all duration-500",
        "hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 group/card",
        className
    )}>
      {(title || Icon || action) && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary transition-transform duration-500 group-hover/card:scale-110 group-hover/card:rotate-3">
                <Icon className="size-5" />
              </div>
            )}
            {title && <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      <div className="flex-1 min-h-0 relative">
        {children}
      </div>
    </div>
  );
};

// --- Main Component ---

interface BentoDashboardProps {
  initialData?: SimpleDashboardData | null;
  initialStartDate?: string;
  initialEndDate?: string;
}

export default function BentoDashboard({
  initialData = null,
  initialStartDate,
  initialEndDate,
}: BentoDashboardProps) {
  const { user, loading: authLoading } = useAuth();
  const { setTheme, isDark } = useTheme();
  const [dashboardData, setDashboardData] = useState<SimpleDashboardData | null>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);

  // Date State Management
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (initialStartDate && initialEndDate) {
      return {
        from: new Date(initialStartDate),
        to: new Date(initialEndDate)
      };
    }
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0)
    };
  });

  const startDateStr = useMemo(() => dateRange?.from?.toISOString().split('T')[0], [dateRange?.from]);
  const endDateStr = useMemo(() => dateRange?.to?.toISOString().split('T')[0], [dateRange?.to]);

  // Fetch Logic
  const fetchDashboardData = useCallback(async (force = false) => {
    if (!user?.id || authLoading) return;
    if (!force && !startDateStr && !endDateStr) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ 
        userId: user.id, 
        ...(startDateStr && { start: startDateStr }),
        ...(endDateStr && { end: endDateStr })
      });
      const response = await fetch(`/api/dashboard-simple?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, authLoading, startDateStr, endDateStr]);

  useEffect(() => {
    if (!initialData || (startDateStr !== initialStartDate || endDateStr !== initialEndDate)) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, initialData, startDateStr, endDateStr, initialStartDate, initialEndDate]);

  if (authLoading || (isLoading && !dashboardData)) return <FinancialSkeleton />;
  if (!dashboardData) return null;

  // Derived Data
  const netWorth = dashboardData.totalNetWorth ?? dashboardData.netSavings;
  const savingsRate = dashboardData.savingsRate;
  const chartData = dashboardData.monthlyTrends.map(item => ({
    name: item.month,
    income: item.credits || item.income,
    expenses: item.debits || item.expenses
  }));

  return (
    <div className="min-h-screen bg-background text-foreground font-display transition-colors duration-500">
      
      {/* Sticky Header Toolbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 max-w-[1600px] items-center justify-between px-8 mx-auto">
            <div className="flex items-center gap-6 flex-1">
                <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-muted/40 rounded-2xl border border-border/50 group focus-within:border-primary/50 transition-all w-96 max-w-full">
                    <Search className="size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Search transactions, budgets..." 
                        className="border-0 bg-transparent focus-visible:ring-0 h-auto p-0 text-sm placeholder:text-muted-foreground/50" 
                    />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hidden xl:block border-l border-border/50 pl-6 h-4 leading-4">
                    Financial Console
                </h2>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden md:block">
                    <DateRangePicker 
                        date={dateRange} 
                        onDateChange={setDateRange} 
                        className="w-[280px]"
                    />
                </div>
                
                <div className="flex items-center gap-2 border-l border-border/50 pl-4 ml-2">
                    <Button variant="ghost" size="icon" className="rounded-xl relative" aria-label="Notifications">
                        <Bell className="size-5" />
                        <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border-2 border-background" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl transition-all duration-500 hover:rotate-12" 
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        aria-label="Toggle theme"
                    >
                        {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
                    </Button>
                    <Button size="icon" className="rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                        <Plus className="size-5" />
                    </Button>
                </div>
            </div>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <LayoutDashboard className="size-6" />
                </div>
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                       Financial Overview
                    </h1>
                    <p className="text-muted-foreground font-medium">
                        Welcome back, <span className="text-foreground font-semibold">{user?.name?.split(' ')[0]}</span>. Track your net worth, expenses, and financial habits.
                    </p>
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-card/40 border border-border/40 rounded-[1.25rem] p-4 backdrop-blur-sm group hover:border-primary/20 transition-all cursor-default">
                 <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold leading-none mb-1.5">Health Score</p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold tracking-tight">{dashboardData.financialHealthScore}</span>
                        <span className="text-xs text-muted-foreground font-bold">/ 100</span>
                    </div>
                 </div>
                 <div className="size-12 rounded-xl bg-background border border-border/50 flex items-center justify-center relative shadow-inner overflow-hidden">
                    <div 
                        className="absolute bottom-0 left-0 w-full bg-primary/20 transition-all duration-1000 ease-out" 
                        style={{ height: `${dashboardData.financialHealthScore}%` }} 
                    />
                    <Star className={cn(
                        "size-5 relative z-10 transition-colors duration-500",
                        dashboardData.financialHealthScore > 70 ? "text-primary fill-primary" : "text-muted-foreground"
                    )} />
                 </div>
              </div>
          </div>
        </div>

        {/* Bento Grid - Refined Responsive Logic */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-6 auto-rows-[minmax(200px,auto)]">
          
          {/* 1. Net Worth (Primary Hub) */}
          <BentoCard className="md:col-span-2 lg:col-span-3 xl:col-span-6 row-span-2 relative overflow-hidden"
            action={
                <Button variant="outline" size="sm" className="rounded-xl border-border/50 hover:bg-foreground/5 text-xs font-bold px-6">
                    Export Report
                </Button>
            }
          >
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
                  <div className="space-y-1">
                      <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-[0.2em] mb-4">
                        <Wallet className="size-4" /> Total Net Worth
                      </div>
                      <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-foreground tabular-nums leading-none">
                          {formatRupees(netWorth)}
                      </h1>
                      <div className="flex items-center gap-4 mt-6">
                           <div className={cn(
                               "px-4 py-2 rounded-2xl text-[10px] font-bold flex items-center gap-2 backdrop-blur-md border uppercase tracking-widest",
                               savingsRate >= 0 
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                           )}>
                               {savingsRate >= 0 ? <TrendingUp className="size-3 animate-pulse" /> : <TrendingDown className="size-3 animate-bounce" />}
                               +{Math.abs(savingsRate).toFixed(1)}% This Month
                           </div>
                           <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Updated just now</p>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 pt-8 border-t border-border/40">
                      <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold mb-2">Net Savings</p>
                          <p className={`text-2xl font-bold tabular-nums ${dashboardData.netSavings >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                            {formatRupees(dashboardData.netSavings)}
                          </p>
                      </div>
                      <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold mb-2">Savings Rate</p>
                          <p className="text-2xl font-bold text-foreground tabular-nums">
                            {dashboardData.savingsRate.toFixed(1)}%
                          </p>
                      </div>
                      <div className="hidden lg:block">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold mb-2">Net Worth</p>
                          <p className="text-2xl font-bold text-foreground tabular-nums">{formatRupees(netWorth)}</p>
                      </div>
                  </div>
              </div>
          </BentoCard>

          {/* 2. Cash Flow Chart (Analytical Insight) */}
          <BentoCard title="Credits vs Debits" className="md:col-span-2 lg:col-span-3 xl:col-span-6 row-span-2" 
            action={
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary" /> 
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Credits</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full border-2 border-dashed border-muted-foreground" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Debits</span>
                    </div>
                </div>
            }
          >
            <div className="h-full w-full min-h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="8 8" opacity={0.3} />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} 
                        dy={15} 
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} 
                        tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} 
                    />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
                            borderColor: 'hsl(var(--border))', 
                            borderRadius: '1.25rem',
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                        }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '4 4' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="income" 
                        name="Credits"
                        stroke="hsl(var(--primary))" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorIncome)" 
                        animationDuration={2000}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="expenses" 
                        name="Debits"
                        stroke="hsl(var(--muted-foreground))" 
                        strokeWidth={2} 
                        strokeDasharray="6 6"
                        fill="transparent" 
                        animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
            </div>
          </BentoCard>

          {/* 3. Salary Card */}
          <BentoCard className="md:col-span-1 xl:col-span-4" title="Salary" icon={Wallet}>
             <Link href="/salary" className="flex flex-col h-full justify-between group">
                <div className="space-y-1">
                    <h2 className="text-4xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {formatRupees(dashboardData.salaryInfo?.takeHome || 0)}
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Take Home</p>
                </div>
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                             <TrendingUp className="size-4" />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[150px]">
                            CTC: {formatRupees(dashboardData.salaryInfo?.ctc || 0)}
                        </span>
                    </div>
                    <ArrowRight className="size-5 -rotate-45 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </div>
             </Link>
          </BentoCard>

          {/* 4. Recent Activity Log */}
          <BentoCard title="Recent Activity" className="md:col-span-1 xl:col-span-4 lg:row-span-2"
            icon={ShoppingBag}
            action={<Link href="/transactions" className="p-2 hover:bg-muted/80 rounded-xl transition-colors"><MoreHorizontal className="size-5" /></Link>}
          >
            <div className="space-y-6">
                {dashboardData.recentTransactions.length > 0 ? dashboardData.recentTransactions.slice(0, 5).map((tx) => {
                    const isPositive = tx.type === 'income' || tx.type === 'credit' || tx.amount > 0;
                    return (
                        <div key={tx.id} className="flex items-center justify-between group/tx cursor-default">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className={cn(
                                    "size-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300",
                                    isPositive 
                                        ? 'bg-emerald-500/15 text-emerald-500 shadow-lg shadow-emerald-500/5' 
                                        : 'bg-card border border-border/60 text-muted-foreground group-hover/tx:border-primary/30 group-hover/tx:text-primary'
                                )}>
                                    <ShoppingBag className="size-5" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-foreground truncate group-hover/tx:text-primary transition-colors">{tx.store || tx.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">{tx.category || 'General'}</span>
                                        <div className="size-1 rounded-full bg-muted-foreground/30" />
                                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tight">Done</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                                <p className={cn(
                                    "text-sm font-bold tabular-nums tracking-tight",
                                    isPositive ? 'text-emerald-500' : 'text-foreground font-extrabold'
                                )}>
                                    {isPositive ? '+' : '-'}{formatRupees(Math.abs(tx.amount))}
                                </p>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-center space-y-4">
                        <div className="size-16 rounded-full bg-muted/40 border-2 border-dashed border-border flex items-center justify-center">
                            <Plus className="size-8 text-muted-foreground/30" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No recent transactions found.</p>
                        <Button variant="outline" size="sm" className="rounded-xl font-bold">Log Entry</Button>
                    </div>
                )}
            </div>
          </BentoCard>

          {/* 5. Plans Card */}
          <BentoCard className="md:col-span-1 xl:col-span-4" title="Plans" icon={Target}
            action={<span className="text-lg font-bold text-primary">{dashboardData.plansInfo?.activePlans || 0}</span>}
          >
             <Link href="/plans" className="flex flex-col h-full justify-between group">
                <div className="mt-2 space-y-4">
                    {dashboardData.plansInfo?.items && dashboardData.plansInfo.items.length > 0 ? (
                        (() => {
                            const top = dashboardData.plansInfo.items[0];
                            const progress = Math.min(100, Math.round((top.currentAmount / top.targetAmount) * 100));
                            const otherCount = (dashboardData.plansInfo.activePlans || 0) - 1;
                            return (
                                <>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end mb-1">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Immediate Goal</div>
                                            <div className="text-xs font-bold text-primary">{progress}%</div>
                                        </div>
                                        <div className="font-bold text-sm truncate text-foreground mb-2">{top.name}</div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/40">
                                            <div 
                                                className="h-full bg-primary rounded-full transition-all duration-1000 ease-in-out" 
                                                style={{ width: `${progress}%` }} 
                                            /> 
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground pt-1">
                                            <span>{formatRupees(top.currentAmount)}</span>
                                            <span>{formatRupees(top.targetAmount)}</span>
                                        </div>
                                    </div>
                                    {otherCount > 0 && (
                                        <p className="text-[10px] text-muted-foreground text-right pt-2 border-t border-border/50 uppercase tracking-widest font-bold">
                                            +{otherCount} other plan{otherCount !== 1 ? 's' : ''} active
                                        </p>
                                    )}
                                </>
                            );
                        })()
                    ) : (
                        <p className="text-xs text-muted-foreground py-2 italic text-center">No active plans</p>
                    )}
                </div>
             </Link>
          </BentoCard>

          {/* 6. Deadlines Card */}
          <BentoCard className="md:col-span-1 xl:col-span-4" title="Deadlines" icon={CalendarClock}
            action={<span className="text-lg font-bold text-orange-500">{dashboardData.deadlinesInfo?.upcoming || 0}</span>}
          >
             <div className="flex flex-col h-full justify-between gap-4 mt-2">
                 <div className="space-y-4">
                     {dashboardData.deadlinesInfo?.items && dashboardData.deadlinesInfo.items.length > 0 ? (
                         dashboardData.deadlinesInfo.items.slice(0, 3).map((item, i) => (
                             <div key={i} className="flex items-center justify-between group/item">
                                 <div className="flex items-center gap-3 overflow-hidden">
                                     <div className="size-1.5 rounded-full bg-orange-500 shrink-0" />
                                     <p className="text-sm font-bold truncate text-foreground">{item.title}</p>
                                 </div>
                                 <span className="text-[10px] font-bold text-muted-foreground tabular-nums whitespace-nowrap ml-2 uppercase">
                                     {new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                 </span>
                             </div>
                         ))
                     ) : (
                         <p className="text-xs text-muted-foreground text-center py-4">No upcoming deadlines</p>
                     )}
                 </div>
                 
                 <Button variant="ghost" asChild className="w-full justify-center text-xs font-bold text-orange-500 hover:bg-orange-500/10 rounded-2xl h-10 group/btn">
                    <Link href="/deadlines">Manage Deadlines <ArrowRight className="size-4 ml-2 group-hover/btn:translate-x-1 transition-transform" /></Link>
                 </Button>
             </div>
          </BentoCard>

          {/* 7. Wishlist Card */}
          <BentoCard className="md:col-span-1 xl:col-span-4" title="Wishlist" icon={Star}
            action={<span className="text-lg font-bold text-yellow-500">{dashboardData.wishlistInfo?.totalItems || 0}</span>}
          >
            <Link href="/wishlist" className="flex flex-col h-full justify-between group mt-2">
                <div className="space-y-4">
                    {dashboardData.wishlistInfo?.items && dashboardData.wishlistInfo.items.length > 0 ? (
                        dashboardData.wishlistInfo.items.slice(0, 3).map((item, i) => (
                            <div key={i} className="flex justify-between items-center group/wish">
                                <span className="text-sm font-bold text-foreground truncate max-w-[150px] group-hover/wish:text-primary transition-colors">{item.name}</span>
                                <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{formatRupees(item.estimatedPrice)}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">No items saved</p>
                    )}
                </div>
                
                <div className="mt-8 flex justify-between items-center pt-4 border-t border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Value</span>
                    <span className="text-sm font-bold text-foreground">{formatRupees(dashboardData.wishlistInfo?.totalCost || 0)}</span>
                </div>
            </Link>
          </BentoCard>

        </div>
      </main>
    </div>
  );
}
