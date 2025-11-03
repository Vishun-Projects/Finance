'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  PiggyBank,
  Activity,
  RefreshCw,
  Filter,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatRupees } from '../lib/utils';
import Link from 'next/link';
import UserValidation from './user-validation';
import PageSkeleton from './page-skeleton';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';

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
  
  // Date range state with single selector approach
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  const [startDate, setStartDate] = useState(defaultStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(defaultEnd.toISOString().split('T')[0]);
  const [quickRange, setQuickRange] = useState<'month' | 'quarter' | 'year' | 'custom'>('month');
  
  // Date range for the date range picker component
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

  // Update data when date range changes (without blank screen)
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

      // Add cache-busting only for refresh button, otherwise use cache
      const cacheBuster = isInitial ? '' : `&_=${Date.now()}`;
      const response = await fetch(
        `/api/dashboard-simple?userId=${user.id}&start=${startDate}&end=${endDate}${cacheBuster}`,
        {
          // Optimize fetch with compression and caching hints
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

  const handleQuickRangeChange = (range: 'month' | 'quarter' | 'year' | 'all' | 'custom') => {
    if (range === 'custom') {
      setQuickRange('custom');
      return;
    }

    const today = new Date();
    let start: Date, end: Date;
    
    switch (range) {
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        setQuickRange('month');
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        setQuickRange('quarter');
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        setQuickRange('year');
        break;
      case 'all':
        start = new Date(2020, 0, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        setQuickRange('custom');
        break;
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setDateRange({ from: start, to: end });
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
      // Only start date selected, wait for end date
      setDateRange(range);
    }
  };


  // Show authentication loading
  if (authLoading) {
    return (
      <div className="container-fluid px-6 py-8">
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
            <Link href="/login">
              <Button>Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="container-fluid px-6 py-8">
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
    <div className="container-fluid px-4 sm:px-6 py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user.name || user.email}</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isUpdating}>
          <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* User Validation */}
      <UserValidation />

      {/* Date Range Filter - Compact */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Date Range</CardTitle>
            </div>
            {isUpdating && (
              <Badge variant="secondary" className="gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Updating
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Range Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={quickRange} onValueChange={(value) => handleQuickRangeChange(value as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            
            <DateRangePicker
              date={dateRange}
              onDateChange={handleDateRangeChange}
              disabled={isUpdating}
              className="flex-1 min-w-[280px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={isUpdating ? 'opacity-75 transition-opacity' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground transition-all">
              {formatRupees(dashboardData.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">For selected period</p>
          </CardContent>
        </Card>

        <Card className={isUpdating ? 'opacity-75 transition-opacity' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground transition-all">
              {formatRupees(dashboardData.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">For selected period</p>
          </CardContent>
        </Card>

        <Card className={isUpdating ? 'opacity-75 transition-opacity' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Savings</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <PiggyBank className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold transition-all ${
              dashboardData.netSavings >= 0 
                ? 'text-foreground' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatRupees(dashboardData.netSavings)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={dashboardData.savingsRate >= 20 ? 'default' : 'secondary'} className="text-xs">
                {dashboardData.savingsRate.toFixed(1)}% savings rate
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className={isUpdating ? 'opacity-75 transition-opacity' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Health Score</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {dashboardData.financialHealthScore}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${dashboardData.financialHealthScore}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card className={isUpdating ? 'opacity-75 transition-opacity' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Income vs Expenses Trend</CardTitle>
              <CardDescription>Financial overview for the selected period</CardDescription>
            </div>
            {isUpdating && (
              <Badge variant="secondary" className="gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Loading
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {dashboardData.monthlyTrends && dashboardData.monthlyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dashboardData.monthlyTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatRupees(value)}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="hsl(142, 76%, 36%)" 
                  strokeWidth={3}
                  name="Income"
                  dot={{ fill: 'hsl(142, 76%, 36%)', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="hsl(0, 84%, 60%)" 
                  strokeWidth={3}
                  name="Expenses"
                  dot={{ fill: 'hsl(0, 84%, 60%)', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="font-medium mb-1">No data available</p>
                <p className="text-sm">Try selecting a different date range</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secondary Metrics & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Goals & Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goals & Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Active Goals</span>
              </div>
              <Badge variant="secondary">{dashboardData.activeGoals}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upcoming Deadlines</span>
              </div>
              <Badge variant="secondary">{dashboardData.upcomingDeadlines}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/income" className="block">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Add Income
              </Button>
            </Link>
            <Link href="/expenses" className="block">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <TrendingDown className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </Link>
            <Link href="/goals" className="block">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Target className="w-4 h-4 mr-2" />
                Set Goal
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Transactions Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <CardDescription>Latest {Math.min(5, dashboardData.recentTransactions.length)} transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recentTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${transaction.amount > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{transaction.title}</p>
                        <p className="text-xs text-muted-foreground">{transaction.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${transaction.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {transaction.amount > 0 ? '+' : ''}{formatRupees(Math.abs(transaction.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent transactions</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}