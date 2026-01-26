import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create fallback data for testing
    const fallbackData = {
      totalIncome: 75000,
      totalExpenses: 45000,
      netSavings: 30000,
      savingsRate: 40,
      upcomingDeadlines: 3,
      activeGoals: 5,
      recentTransactions: [
        { id: 1, title: 'Salary', amount: 75000, type: 'income', date: '2024-01-01', category: 'Salary' },
        { id: 2, title: 'Rent', amount: -15000, type: 'expense', date: '2024-01-02', category: 'Housing' },
        { id: 3, title: 'Groceries', amount: -5000, type: 'expense', date: '2024-01-03', category: 'Food' },
        { id: 4, title: 'Freelance', amount: 10000, type: 'income', date: '2024-01-04', category: 'Freelance' },
        { id: 5, title: 'Transport', amount: -3000, type: 'expense', date: '2024-01-05', category: 'Transport' }
      ],
      monthlyTrends: [
        { month: 'Jan', income: 75000, expenses: 45000, savings: 30000 },
        { month: 'Feb', income: 78000, expenses: 42000, savings: 36000 },
        { month: 'Mar', income: 82000, expenses: 48000, savings: 34000 },
        { month: 'Apr', income: 79000, expenses: 46000, savings: 33000 },
        { month: 'May', income: 85000, expenses: 44000, savings: 41000 },
        { month: 'Jun', income: 88000, expenses: 47000, savings: 41000 }
      ],
      categoryBreakdown: [
        { category: 'Housing', amount: 15000, percentage: 33, color: '#3B82F6' },
        { category: 'Food', amount: 8000, percentage: 18, color: '#10B981' },
        { category: 'Transport', amount: 6000, percentage: 13, color: '#F59E0B' },
        { category: 'Entertainment', amount: 5000, percentage: 11, color: '#EF4444' },
        { category: 'Utilities', amount: 4000, percentage: 9, color: '#8B5CF6' },
        { category: 'Others', amount: 7000, percentage: 16, color: '#6B7280' }
      ],
      financialHealthScore: 78,
      emergencyFundMonths: 4.2,
      debtToIncomeRatio: 18,
      userPersona: 'casual-budgeter',
      personalizedInsights: [
        '🎉 Excellent savings rate! You\'re building a strong financial foundation.',
        '👍 Good job tracking your expenses! Keep it up for better insights.',
        '🎯 Consider setting up more financial goals to accelerate your wealth building.'
      ],
      behavioralAlerts: [
        {
          type: 'info',
          message: 'Your emergency fund covers 4.2 months of expenses. Consider increasing to 6 months for better security.',
          urgency: 'medium'
        }
      ],
      spendingPatterns: {
        totalTransactions: 25,
        averageTransaction: 1800,
        mostExpensiveCategory: 'Housing',
        spendingTrend: 'stable',
        topCategories: [
          ['Housing', 15000],
          ['Food', 8000],
          ['Transport', 6000]
        ]
      },
      goalProgress: [
        {
          id: '1',
          title: 'Emergency Fund',
          target: 150000,
          current: 105000,
          progress: 70,
          deadline: '2024-12-31',
          priority: 'high'
        },
        {
          id: '2',
          title: 'Vacation Fund',
          target: 50000,
          current: 25000,
          progress: 50,
          deadline: '2024-06-30',
          priority: 'medium'
        }
      ],
      upcomingBills: [
        {
          id: '1',
          title: 'Electricity Bill',
          amount: 2500,
          dueDate: '2024-01-15',
          category: 'Utilities'
        },
        {
          id: '2',
          title: 'Internet Bill',
          amount: 1200,
          dueDate: '2024-01-20',
          category: 'Utilities'
        }
      ],
      financialMilestones: [
        {
          title: 'Savings Champion',
          description: 'You\'re saving 40% of your income!',
          achieved: true,
          icon: '🏆'
        },
        {
          title: 'Goal Setter',
          description: 'You have 5 financial goals!',
          achieved: true,
          icon: '🎯'
        },
        {
          title: 'High Earner',
          description: 'Your monthly income is above ₹50,000!',
          achieved: true,
          icon: '💰'
        }
      ]
    };

    return NextResponse.json(fallbackData);
  } catch (error) {
    console.error('Error in fallback API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
