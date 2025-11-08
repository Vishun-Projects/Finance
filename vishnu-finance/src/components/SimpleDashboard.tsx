'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar as CalendarIcon,
  PiggyBank,
  Activity,
  RefreshCw,
  Filter,
  Plus,
  User,
  Eye,
  EyeOff,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatRupees } from '../lib/utils';
import Link from 'next/link';
import UserValidation from './UserValidation';
import PageSkeleton from './page-skeleton';
import { Avatar } from './ui/avatar';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { DateRange } from 'react-day-picker';
import QuickRangeChips, { QuickRange } from './ui/quick-range-chips';
import FilterSheet from './ui/filter-sheet';
import FabButton from './ui/fab-button';
import { Calendar } from './ui/calendar';

interface SimpleDashboardData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  upcomingDeadlines: number;
  activeGoals: number;
  recentTransactions: Array<{
    id: string;
    title: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
  }>;
  financialHealthScore: number;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }>;
  categoryBreakdown: Array<{
    name: string;
    amount: number;
  }>;
}

export default function SimpleDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<SimpleDashboardData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showIncome, setShowIncome] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  
  // Date range state
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  const [startDate, setStartDate] = useState(defaultStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(defaultEnd.toISOString().split('T')[0]);
  const [quickRange, setQuickRange] = useState<QuickRange>('month');
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: defaultStart,
    to: defaultEnd,
  });

  // Load data on mount
  useEffect(() => {
    if (user && !authLoading) {
      loadDashboardData(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  // Update data when date range changes
  useEffect(() => {
    if (user && !authLoading && dashboardData) {
      loadDashboardData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const loadDashboardData = async (isInitial = false) => {
    if (!user) return;

    try {
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setIsUpdating(true);
      }

      const cacheBuster = isInitial ? '' : `&_=${Date.now()}`;
      const response = await fetch(
        `/api/dashboard-simple?userId=${user.id}&start=${startDate}&end=${endDate}${cacheBuster}`,
        {
          headers: {
            'Accept': 'application/json',
          },
          cache: isInitial ? 'default' : 'no-store'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      if (isInitial) {
        setInitialLoading(false);
      } else {
        setIsUpdating(false);
      }
    }
  };

  const handleRefresh = async () => {
    await loadDashboardData(false);
  };

  const handleQuickRangeChange = (range: QuickRange) => {
    if (range === 'custom') {
      setIsDateSheetOpen(true);
      return;
    }

    const today = new Date();
    let start: Date, end: Date;
    
    switch (range) {
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'lastMonth': {
        const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start = new Date(prev.getFullYear(), prev.getMonth(), 1);
        end = new Date(prev.getFullYear(), prev.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'all':
        start = new Date(2020, 0, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      default:
        return;
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setDateRange({ from: start, to: end });
    setQuickRange(range);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const start = new Date(range.from);
      start.setHours(0, 0, 0, 0);
      const end = new Date(range.to);
      end.setHours(23, 59, 59, 999);
      
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
      setDateRange(range);
      setQuickRange('custom');
    } else if (range?.from) {
      setDateRange(range);
    }
  };

  // Show authentication loading
  if (authLoading) {
    return (
      <div className="container-fluid px-4 sm:px-6 py-6">
        <PageSkeleton />
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="container-fluid px-6">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-foreground mb-4">Please Login</h3>
            <p className="text-muted-foreground mb-8">You need to be logged in to view your dashboard</p>
            <Link href="/auth">
              <Button>Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="container-fluid px-4 sm:px-6 py-6">
        <PageSkeleton />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="container-fluid px-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
            <p className="text-muted-foreground">Start by adding your first income or expense</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="w-full bg-background pb-20 md:pb-6">
      {/* Sticky Header - Compact */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="container-fluid px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isUpdating}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${isUpdating ? 'animate-spin' : ''}`} />
              </button>
              <Avatar
                src={user?.avatarUrl}
                userId={user?.id || ''}
                size="sm"
                alt={`User avatar for ${user.name || user.email}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* User Validation */}
      <div className="px-4 sm:px-6 pt-4">
        <UserValidation />
      </div>

      <div className="container-fluid px-4 sm:px-6 py-4 space-y-4">
        {/* Quick Date Range Chips - One-tap filters */}
        <div className="flex items-center justify-between gap-2">
          <QuickRangeChips value={quickRange} onChange={handleQuickRangeChange} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDateSheetOpen(true)}
            className="flex-shrink-0"
          >
            <Filter className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Custom</span>
          </Button>
        </div>

        {/* Horizontally Scrollable Metric Cards */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex gap-3 min-w-max">
            {/* Income Card */}
            <div className="min-w-[280px] bg-card rounded-lg border p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Total Income</span>
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatRupees(dashboardData.totalIncome)}
              </div>
            </div>

            {/* Expenses Card */}
            <div className="min-w-[280px] bg-card rounded-lg border p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Total Expenses</span>
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatRupees(dashboardData.totalExpenses)}
              </div>
            </div>

            {/* Net Savings Card */}
            <div className="min-w-[280px] bg-card rounded-lg border p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Net Savings</span>
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <PiggyBank className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className={`text-2xl font-bold ${dashboardData.netSavings >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}>
                {formatRupees(dashboardData.netSavings)}
              </div>
              <Badge variant={dashboardData.savingsRate >= 20 ? 'default' : 'secondary'} className="text-xs mt-1">
                {dashboardData.savingsRate.toFixed(1)}%
              </Badge>
            </div>

            {/* Health Score Card */}
            <div className="min-w-[280px] bg-card rounded-lg border p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Health Score</span>
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {dashboardData.financialHealthScore}
                <span className="text-sm font-normal text-muted-foreground">/100</span>
              </div>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${dashboardData.financialHealthScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Compressed Chart - 200px height with toggleable series */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Income vs Expenses</CardTitle>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowIncome(!showIncome)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    showIncome ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                  }`}
                  aria-label={showIncome ? 'Hide Income' : 'Show Income'}
                >
                  {showIncome ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => setShowExpenses(!showExpenses)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    showExpenses ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-muted text-muted-foreground'
                  }`}
                  aria-label={showExpenses ? 'Hide Expenses' : 'Show Expenses'}
                >
                  {showExpenses ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.monthlyTrends && dashboardData.monthlyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dashboardData.monthlyTrends} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '11px' }}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '11px' }}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatRupees(value)}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, fontSize: '12px' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  {showIncome && (
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      stroke="hsl(142, 76%, 36%)" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                  {showExpenses && (
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="hsl(0, 84%, 60%)" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">No data available</p>
                  <p className="text-xs">Try selecting a different date range</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals & Deadlines - Compact Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => window.location.href = '/goals'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Goals</span>
                </div>
                <Badge variant="secondary">{dashboardData.activeGoals}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => window.location.href = '/deadlines'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Deadlines</span>
                </div>
                <Badge variant="secondary">{dashboardData.upcomingDeadlines}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions - Compact List with Progressive Disclosure */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <Link href="/transactions" className="text-xs text-primary hover:underline">
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardData.recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {dashboardData.recentTransactions.slice(0, 5).map((transaction) => (
                  <Link
                    key={transaction.id}
                    href="/transactions"
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${transaction.amount > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{transaction.title}</p>
                        <p className="text-xs text-muted-foreground">{transaction.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className={`text-sm font-semibold ${transaction.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.amount > 0 ? '+' : ''}{formatRupees(Math.abs(transaction.amount))}
                      </p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">No transactions yet</p>
                <Link href="/transactions?type=INCOME">
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Transaction
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FAB - Mobile Only */}
      <FabButton
        icon={<Plus className="w-6 h-6" />}
        label="Add Transaction"
        onClick={() => window.location.href = '/transactions'}
      />

      {/* Date Range Bottom Sheet - Mobile */}
      <FilterSheet open={isDateSheetOpen} onClose={() => setIsDateSheetOpen(false)} title="Select Date Range">
        <div className="space-y-4">
          <QuickRangeChips value={quickRange} onChange={(range) => {
            handleQuickRangeChange(range);
            if (range !== 'custom') {
              setIsDateSheetOpen(false);
            }
          }} />
          <div>
            <label className="block text-sm font-medium mb-2">Custom Date Range</label>
            <div className="border rounded-lg p-3">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  handleDateRangeChange(range);
                  if (range?.from && range?.to) {
                    setIsDateSheetOpen(false);
                  }
                }}
                numberOfMonths={1}
              />
            </div>
          </div>
        </div>
      </FilterSheet>
    </div>
  );
}
