import { NextRequest, NextResponse } from 'next/server';
import { withCache, QueryOptimizer, PerformanceMonitor, CACHE_TTL } from '@/lib/api-cache';

export const GET = withCache({ ttl: CACHE_TTL.ANALYTICS })(async function (request: NextRequest) {
  const timer = PerformanceMonitor.startTimer('analytics_api');

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || '6';
    const type = searchParams.get('type'); // 'dashboard' or 'reports'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Use optimized dashboard data fetching
    const dashboardData = await QueryOptimizer.optimizedDashboardData(userId);
    
    // Calculate analytics from the fetched data
    const totalIncome = dashboardData.income.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0);
    const totalExpenses = dashboardData.expenses.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Process monthly trends
    const monthlyTrends = processMonthlyTrends(dashboardData.income, dashboardData.expenses, parseInt(period));
    
    // Process category breakdown
    const categoryBreakdown = processCategoryBreakdown(dashboardData.expenses);

    const analyticsData = {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      monthlyTrends,
      categoryBreakdown,
      activeGoals: dashboardData.goals.length,
      upcomingDeadlines: dashboardData.deadlines.length,
      recentTransactions: [
        ...dashboardData.income.slice(0, 3).map((item: any) => ({
          id: item.id,
          type: 'income',
          amount: parseFloat(item.amount),
          description: item.name,
          date: item.startDate
        })),
        ...dashboardData.expenses.slice(0, 3).map((item: any) => ({
          id: item.id,
          type: 'expense',
          amount: parseFloat(item.amount),
          description: item.description,
          date: item.date
        }))
      ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
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