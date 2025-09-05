import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || '6';
    const type = searchParams.get('type'); // 'dashboard' or 'reports'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // If type is 'reports', return detailed analytics data
    if (type === 'reports') {
      const reportsData = {
        monthlyTrends: {
          monthlyIncome: [
            { month: '2024-01', amount: 0 },
            { month: '2024-02', amount: 0 },
            { month: '2024-03', amount: 0 },
            { month: '2024-04', amount: 0 },
            { month: '2024-05', amount: 0 },
            { month: '2024-06', amount: 0 }
          ],
          monthlyExpenses: [
            { month: '2024-01', amount: 0 },
            { month: '2024-02', amount: 0 },
            { month: '2024-03', amount: 0 },
            { month: '2024-04', amount: 0 },
            { month: '2024-05', amount: 0 },
            { month: '2024-06', amount: 0 }
          ],
          monthlySavings: [
            { month: '2024-01', amount: 0 },
            { month: '2024-02', amount: 0 },
            { month: '2024-03', amount: 0 },
            { month: '2024-04', amount: 0 },
            { month: '2024-05', amount: 0 },
            { month: '2024-06', amount: 0 }
          ]
        },
        categoryBreakdown: [
          { category: 'Food & Dining', amount: 0, percentage: 0 },
          { category: 'Transportation', amount: 0, percentage: 0 },
          { category: 'Entertainment', amount: 0, percentage: 0 },
          { category: 'Shopping', amount: 0, percentage: 0 },
          { category: 'Bills & Utilities', amount: 0, percentage: 0 }
        ],
        goalProgress: [
          { goal: 'Emergency Fund', current: 0, target: 100000, percentage: 0 },
          { goal: 'Vacation Fund', current: 0, target: 50000, percentage: 0 },
          { goal: 'Investment Portfolio', current: 0, target: 200000, percentage: 0 }
        ],
        wishlistAnalysis: {
          totalItems: 0,
          completedItems: 0,
          totalCost: 0,
          priorityBreakdown: {
            'LOW': 0,
            'MEDIUM': 0,
            'HIGH': 0,
            'CRITICAL': 0
          }
        },
        dashboardMetrics: {
          totalIncome: 0,
          totalExpenses: 0,
          netSavings: 0,
          savingsRate: 0,
          upcomingDeadlines: 0,
          activeGoals: 0,
          wishlistItems: 0,
          monthlyTrend: 'stable' as 'increasing' | 'decreasing' | 'stable'
        },
        impactAnalysis: {
          totalMonthlyIncome: 0,
          totalMonthlyExpenses: 0,
          availableForGoals: 0,
          totalGoalTargets: 0,
          totalWishlistCost: 0,
          goalFundingRatio: 0,
          wishlistFundingRatio: 0,
          recommendations: []
        }
      };
      return NextResponse.json(reportsData);
    }

    // Default: Return data structure that matches dashboard expectations
    const dashboardData = {
      totalIncome: 0,
      totalExpenses: 0,
      netSavings: 0,
      savingsRate: 0,
      upcomingDeadlines: 0,
      activeGoals: 0,
      recentTransactions: [],
      monthlyTrends: [
        { month: 'Jan', income: 0, expenses: 0, savings: 0 },
        { month: 'Feb', income: 0, expenses: 0, savings: 0 },
        { month: 'Mar', income: 0, expenses: 0, savings: 0 },
        { month: 'Apr', income: 0, expenses: 0, savings: 0 },
        { month: 'May', income: 0, expenses: 0, savings: 0 },
        { month: 'Jun', income: 0, expenses: 0, savings: 0 }
      ]
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
