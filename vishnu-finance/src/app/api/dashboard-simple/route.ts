import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

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

    console.log('🔍 Fetching data for user:', userId);

    // Get user's data in parallel
    const [expenses, incomeSources, goals, deadlines] = await Promise.all([
      prisma.expense.findMany({
        where: { userId },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 50
      }),
      prisma.incomeSource.findMany({
        where: { userId, isActive: true },
        include: { category: true }
      }),
      prisma.goal.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.deadline.findMany({
        where: { userId },
        orderBy: { dueDate: 'asc' }
      })
    ]);

    console.log('📊 Data fetched:', {
      expenses: expenses.length,
      incomeSources: incomeSources.length,
      goals: goals.length,
      deadlines: deadlines.length
    });

    // Calculate current month data
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    console.log(`📅 Current month: ${currentMonth.toDateString()}`);
    console.log(`📅 Month range: ${startOfMonth.toDateString()} to ${endOfMonth.toDateString()}`);

    // Calculate total income - include all income sources for now
    const totalIncomeThisMonth = incomeSources.reduce((sum, source) => {
      const sourceDate = new Date(source.startDate);
      const isInCurrentMonth = sourceDate >= startOfMonth && sourceDate <= endOfMonth;
      
      console.log(`💰 Income source: ${source.name}, Amount: ${source.amount}, Frequency: ${source.frequency}, Date: ${sourceDate.toDateString()}, InCurrentMonth: ${isInCurrentMonth}`);
      
      if (source.frequency === 'ONE_TIME') {
        // For now, include all one-time income regardless of month
        const amount = Number(source.amount);
        console.log(`   → ONE_TIME: ${amount} (including all months for now)`);
        return sum + amount;
      } else if (source.frequency === 'MONTHLY') {
        const amount = Number(source.amount);
        console.log(`   → MONTHLY: ${amount}`);
        return sum + amount;
      } else if (source.frequency === 'YEARLY') {
        const amount = Number(source.amount) / 12;
        console.log(`   → YEARLY: ${amount}`);
        return sum + amount;
      } else if (source.frequency === 'WEEKLY') {
        const amount = Number(source.amount) * 4.33;
        console.log(`   → WEEKLY: ${amount}`);
        return sum + amount;
      } else if (source.frequency === 'DAILY') {
        const amount = Number(source.amount) * 30;
        console.log(`   → DAILY: ${amount}`);
        return sum + amount;
      }
      return sum;
    }, 0);

    console.log(`💰 Total income calculated: ${totalIncomeThisMonth}`);

    // Calculate total expenses (all expenses, not just current month)
    const totalExpenses = expenses
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    // Also calculate current month expenses for reference
    const monthlyExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
      })
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    console.log(`💸 Total expenses (all time): ${totalExpenses}`);
    console.log(`💸 Current month expenses: ${monthlyExpenses}`);

    const netSavings = totalIncomeThisMonth - totalExpenses;
    const savingsRate = totalIncomeThisMonth > 0 ? (netSavings / totalIncomeThisMonth) * 100 : 0;

    console.log(`💰 Net savings: ${netSavings}`);
    console.log(`📊 Savings rate: ${savingsRate.toFixed(1)}%`);

    // Get recent transactions
    const recentTransactions = expenses.slice(0, 10).map(expense => ({
      id: expense.id,
      title: expense.description || 'Expense',
      amount: -Number(expense.amount),
      type: 'expense',
      date: expense.date.toISOString().split('T')[0],
      category: expense.category?.name || 'Other'
    }));

    // Add income transactions
    const incomeTransactions = incomeSources.slice(0, 5).map(income => ({
      id: income.id,
      title: income.name,
      amount: Number(income.amount),
      type: 'income',
      date: income.startDate.toISOString().split('T')[0],
      category: income.category?.name || 'Income'
    }));

    const allTransactions = [...incomeTransactions, ...recentTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Calculate financial health score
    let financialHealthScore = 0;
    if (savingsRate >= 20) financialHealthScore += 30;
    else if (savingsRate >= 10) financialHealthScore += 20;
    else if (savingsRate >= 5) financialHealthScore += 10;

    if (goals.length >= 3) financialHealthScore += 20;
    else if (goals.length >= 1) financialHealthScore += 10;

    if (expenses.length >= 30) financialHealthScore += 20;
    else if (expenses.length >= 10) financialHealthScore += 10;

    const overdueDeadlines = deadlines.filter(d => !d.isCompleted && d.dueDate < new Date()).length;
    if (overdueDeadlines === 0) financialHealthScore += 15;
    else if (overdueDeadlines <= 2) financialHealthScore += 10;

    if (totalIncomeThisMonth > 0) financialHealthScore += 15;

    const result = {
      totalIncome: totalIncomeThisMonth,
      totalExpenses: totalExpenses,
      netSavings,
      savingsRate: Math.round(savingsRate * 100) / 100,
      upcomingDeadlines: deadlines.filter(d => !d.isCompleted && d.dueDate > new Date()).length,
      activeGoals: goals.length,
      recentTransactions: allTransactions,
      monthlyTrends: [],
      categoryBreakdown: [],
      financialHealthScore: Math.min(financialHealthScore, 100),
      emergencyFundMonths: 0,
      debtToIncomeRatio: 0,
      userPersona: 'casual-budgeter',
      personalizedInsights: [
        savingsRate >= 20 ? '🎉 Excellent savings rate! You\'re building a strong financial foundation.' :
        savingsRate >= 10 ? '👍 Good savings rate! Consider increasing it to 20% for better financial security.' :
        '💡 Your savings rate could be improved. Try the 50-30-20 rule for better budgeting.'
      ],
      behavioralAlerts: [],
      dailyTip: {
        title: 'Prepare for Medical Emergencies',
        description: 'Have health insurance and medical emergency fund to handle unexpected health issues.',
        category: 'beginner',
        impact: 'high'
      },
      spendingPatterns: {
        totalTransactions: expenses.length,
        averageTransaction: expenses.length > 0 ? expenses.reduce((sum, e) => sum + Number(e.amount), 0) / expenses.length : 0,
        mostExpensiveCategory: 'Other',
        spendingTrend: 'stable',
        topCategories: []
      },
      goalProgress: goals.map(goal => ({
        id: goal.id,
        title: goal.title,
        target: Number(goal.targetAmount),
        current: Number(goal.currentAmount),
        progress: (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100,
        deadline: goal.targetDate?.toISOString().split('T')[0],
        priority: goal.priority
      })),
      upcomingBills: deadlines
        .filter(deadline => !deadline.isCompleted && deadline.dueDate > new Date())
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .slice(0, 5)
        .map(deadline => ({
          id: deadline.id,
          title: deadline.title,
          amount: Number(deadline.amount || 0),
          dueDate: deadline.dueDate.toISOString().split('T')[0],
          category: deadline.category || 'Other'
        })),
      financialMilestones: []
    };

    console.log('✅ Dashboard data prepared:', {
      totalIncome: result.totalIncome,
      totalExpenses: result.totalExpenses,
      netSavings: result.netSavings,
      healthScore: result.financialHealthScore
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error in simple dashboard API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
