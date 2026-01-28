import { NextRequest, NextResponse } from 'next/server';
import { withCache, QueryOptimizer, PerformanceMonitor, CACHE_TTL } from '@/lib/api-cache';

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 120; // Revalidate every 2 minutes

export const GET = withCache({ ttl: CACHE_TTL.ANALYTICS })(async function (request: NextRequest) {
  const timer = PerformanceMonitor.startTimer('analytics_api');

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = parseInt(searchParams.get('period') || '6', 10);

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Calculate Date Range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - period);
    startDate.setDate(1); // Start of that month

    // Use DashboardService
    const { dashboardService } = await import('@/lib/dashboard-service');
    const data = await dashboardService.getSimpleStats({ userId, startDate, endDate });

    // Map to Analytics Response
    const totalDetails = data.categoryBreakdown.reduce((acc: number, item: { amount: number }) => acc + item.amount, 0);

    const analyticsData = {
      totalIncome: data.totalIncome,
      totalExpenses: data.totalExpenses,
      netSavings: data.netSavings,
      savingsRate: data.savingsRate,
      monthlyTrends: data.monthlyTrends.map((t: any) => ({
        month: t.month,
        income: t.income,
        expenses: t.expenses,
        savings: t.savings
      })),
      categoryBreakdown: data.categoryBreakdown.map((c: any) => ({
        category: c.name,
        amount: c.amount,
        percentage: totalDetails > 0 ? (c.amount / totalDetails) * 100 : 0
      })),
      activeGoals: data.activeGoals,
      upcomingDeadlines: data.upcomingDeadlines,
      recentTransactions: data.recentTransactions.map((t: any) => ({
        id: t.id,
        type: t.type === 'credit' ? 'income' : t.type === 'debit' ? 'expense' : t.type,
        amount: Math.abs(t.amount),
        description: t.title,
        date: t.date
      }))
    };

    timer();
    return NextResponse.json(analyticsData);
  } catch (error) {
    timer();
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
});

// Helper functions for data processing
function processMonthlyTrends(income: any[], expenses: any[], months: number) {
  const trends: any[] = [];
  const currentDate = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

    const monthIncome = income
      .filter(item => {
        const itemDate = new Date(item.startDate);
        return `${itemDate.getFullYear()}-${itemDate.getMonth()}` === monthKey;
      })
      .reduce((sum, item) => sum + parseFloat(item.amount), 0);

    const monthExpenses = expenses
      .filter(item => {
        const itemDate = new Date(item.date);
        return `${itemDate.getFullYear()}-${itemDate.getMonth()}` === monthKey;
      })
      .reduce((sum, item) => sum + parseFloat(item.amount), 0);

    trends.push({
      month: monthNames[date.getMonth()],
      income: monthIncome,
      expenses: monthExpenses,
      savings: monthIncome - monthExpenses
    });
  }

  return trends;
}

function processCategoryBreakdown(expenses: any[]) {
  const categoryMap = new Map<string, number>();

  expenses.forEach(expense => {
    const category = expense.description || 'Other';
    const amount = parseFloat(expense.amount);
    categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
  });

  const total = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0);

  return Array.from(categoryMap.entries()).map(([category, amount]) => ({
    category,
    amount,
    percentage: total > 0 ? (amount / total) * 100 : 0
  })).sort((a, b) => b.amount - a.amount);
}