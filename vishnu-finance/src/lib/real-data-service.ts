// Real data service that connects to your actual database
import { prisma } from './db';
import { FinancialEducation } from './financial-education';
import { PersonaService } from './user-personas';

export interface RealDashboardData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  upcomingDeadlines: number;
  activeGoals: number;
  recentTransactions: any[];
  monthlyTrends: any[];
  categoryBreakdown: any[];
  financialHealthScore: number;
  creditScore?: number;
  emergencyFundMonths: number;
  debtToIncomeRatio: number;
  userPersona: string;
  personalizedInsights: string[];
  behavioralAlerts: any[];
  dailyTip: any;
  spendingPatterns: any;
  goalProgress: any[];
  upcomingBills: any[];
  financialMilestones: any[];
  recurringMonthlyIncome: number;
  wishlistCount: number;
  salaryStructureCount: number;
  recurringItemCount: number;
}

export class RealDataService {
  // Get comprehensive dashboard data for a user
  static async getDashboardData(userId: string): Promise<RealDashboardData> {
    try {
      // Get user's financial data in parallel
      const [
        expenses,
        incomeSources,
        goals,
        deadlines,
        wishlistItems,
        salaryStructures,
        recurringItems
      ] = await Promise.all([
        prisma.transaction.findMany({
          where: { userId, financialCategory: 'EXPENSE', isDeleted: false },
          include: { category: true },
          orderBy: { transactionDate: 'desc' },
          take: 50
        }),
        prisma.transaction.findMany({
          where: { userId, financialCategory: 'INCOME', isDeleted: false },
          include: { category: true }
        }),
        prisma.goal.findMany({
          where: { userId, isActive: true },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.deadline.findMany({
          where: { userId },
          orderBy: { dueDate: 'asc' }
        }),
        prisma.wishlistItem.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.salaryStructure.findMany({
          where: { userId, isActive: true }
        }),
        prisma.recurringItem.findMany({
          where: { userId, isActive: true }
        })
      ]);

      // Calculate financial metrics
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const wishlistCount = wishlistItems.length;
      const salaryStructureCount = salaryStructures.length;
      const recurringItemCount = recurringItems.length;

      // Calculate total income for current month (including one-time income)
      const totalIncomeThisMonth = incomeSources.reduce((sum: number, source: any) => {
        const sourceDate = new Date(source.transactionDate);
        const isInCurrentMonth = sourceDate >= startOfMonth && sourceDate <= endOfMonth;

        // Transaction model uses creditAmount for income
        return isInCurrentMonth ? sum + Number(source.creditAmount) : sum;
      }, 0);

      // Also calculate recurring monthly income for trends
      const recurringMonthlyIncome = 0; // Simplified as Transaction model doesn't track frequency directly

      const monthlyExpenses = expenses
        .filter((expense: any) => {
          const expenseDate = new Date(expense.transactionDate);
          return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
        })
        .reduce((sum: number, expense: any) => sum + Number(expense.debitAmount), 0);

      const netSavings = totalIncomeThisMonth - monthlyExpenses;
      const savingsRate = totalIncomeThisMonth > 0 ? (netSavings / totalIncomeThisMonth) * 100 : 0;

      // Calculate financial health score
      const financialHealthScore = this.calculateFinancialHealthScore({
        savingsRate,
        monthlyIncome: totalIncomeThisMonth,
        monthlyExpenses,
        goals,
        deadlines,
        expenses
      });

      // Get monthly trends (last 6 months)
      const monthlyTrends = await this.getMonthlyTrends(userId, 6);

      // Get category breakdown
      const categoryBreakdown = this.getCategoryBreakdown(expenses);

      // Get recent transactions
      const recentTransactions = expenses.slice(0, 10).map((expense: any) => ({
        id: expense.id,
        title: expense.description || 'Expense',
        amount: -Number(expense.debitAmount),
        type: 'expense',
        date: expense.transactionDate.toISOString().split('T')[0],
        category: expense.category?.name || 'Other'
      }));

      // Add income transactions
      const incomeTransactions = incomeSources.slice(0, 5).map((income: any) => ({
        id: income.id,
        title: income.description || 'Income',
        amount: Number(income.creditAmount),
        type: 'income',
        date: income.transactionDate.toISOString().split('T')[0],
        category: income.category?.name || 'Income'
      }));

      const allTransactions = [...incomeTransactions, ...recentTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      // Detect user persona
      const userPersona = this.detectUserPersona({
        incomePattern: incomeSources.length > 1 ? 'multiple' : 'regular',
        expenseComplexity: expenses.length > 50 ? 'complex' : 'moderate',
        goalTypes: goals.map((g: any) => g.category || 'general'),
        featureUsage: ['expense-tracking', 'goal-setting'],
        timeSpent: 15
      });

      // Get personalized insights
      const personalizedInsights = this.generatePersonalizedInsights({
        savingsRate,
        monthlyIncome: totalIncomeThisMonth,
        monthlyExpenses,
        goals,
        deadlines,
        expenses,
        userPersona
      });

      // Get behavioral alerts
      const behavioralAlerts = this.generateBehavioralAlerts({
        savingsRate,
        monthlyIncome: totalIncomeThisMonth,
        monthlyExpenses,
        goals,
        deadlines,
        expenses
      });

      // Get daily tip
      const dailyTip = FinancialEducation.getTipOfTheDay();

      // Get spending patterns
      const spendingPatterns = this.analyzeSpendingPatterns(expenses);

      // Get goal progress
      const goalProgress = goals.map((goal: any) => ({
        id: goal.id,
        title: goal.title,
        target: Number(goal.targetAmount),
        current: Number(goal.currentAmount),
        progress: (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100,
        deadline: goal.targetDate?.toISOString().split('T')[0],
        priority: goal.priority
      }));

      // Get upcoming bills
      const upcomingBills = deadlines
        .filter((deadline: any) => !deadline.isCompleted && deadline.dueDate > new Date())
        .sort((a: any, b: any) => a.dueDate.getTime() - b.dueDate.getTime())
        .slice(0, 5)
        .map((deadline: any) => ({
          id: deadline.id,
          title: deadline.title,
          amount: Number(deadline.amount || 0),
          dueDate: deadline.dueDate.toISOString().split('T')[0],
          category: deadline.category || 'Other'
        }));

      // Get financial milestones
      const financialMilestones = this.generateFinancialMilestones({
        savingsRate,
        monthlyIncome: totalIncomeThisMonth,
        goals,
        expenses
      });

      return {
        totalIncome: totalIncomeThisMonth,
        totalExpenses: monthlyExpenses,
        netSavings,
        savingsRate: Math.round(savingsRate * 100) / 100,
        upcomingDeadlines: deadlines.filter((d: any) => !d.isCompleted && d.dueDate > new Date()).length,
        activeGoals: goals.length,
        recentTransactions: allTransactions,
        monthlyTrends,
        categoryBreakdown,
        financialHealthScore,
        emergencyFundMonths: this.calculateEmergencyFundMonths(monthlyExpenses, goals),
        debtToIncomeRatio: this.calculateDebtToIncomeRatio(totalIncomeThisMonth, expenses),
        userPersona,
        personalizedInsights,
        behavioralAlerts,
        dailyTip,
        spendingPatterns,
        goalProgress,
        upcomingBills,
        financialMilestones,
        recurringMonthlyIncome,
        wishlistCount,
        salaryStructureCount,
        recurringItemCount,
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  // Calculate financial health score
  private static calculateFinancialHealthScore(data: any): number {
    let score = 0;

    // Savings rate (30 points)
    if (data.savingsRate >= 20) score += 30;
    else if (data.savingsRate >= 10) score += 20;
    else if (data.savingsRate >= 5) score += 10;

    // Goal setting (20 points)
    if (data.goals.length >= 3) score += 20;
    else if (data.goals.length >= 1) score += 10;

    // Expense tracking (20 points)
    if (data.expenses.length >= 30) score += 20;
    else if (data.expenses.length >= 10) score += 10;

    // Deadline management (15 points)
    const overdueDeadlines = data.deadlines.filter((d: any) =>
      !d.isCompleted && d.dueDate < new Date()
    ).length;
    if (overdueDeadlines === 0) score += 15;
    else if (overdueDeadlines <= 2) score += 10;

    // Income stability (15 points)
    if (data.monthlyIncome > 0) score += 15;

    return Math.min(score, 100);
  }

  // Get monthly trends
  private static async getMonthlyTrends(userId: string, months: number): Promise<any[]> {
    const trends = [];
    const currentDate = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);

      const [monthlyExpenses, monthlyIncome] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            userId,
            financialCategory: 'EXPENSE',
            transactionDate: {
              gte: monthStart,
              lte: monthEnd
            },
            isDeleted: false
          },
          _sum: { debitAmount: true }
        }),
        prisma.transaction.aggregate({
          where: {
            userId,
            financialCategory: 'INCOME',
            transactionDate: {
              gte: monthStart,
              lte: monthEnd
            },
            isDeleted: false
          },
          _sum: { creditAmount: true }
        })
      ]);

      const income = Number(monthlyIncome._sum.creditAmount || 0);
      const expenses = Number(monthlyExpenses._sum.debitAmount || 0);
      const savings = income - expenses;

      trends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        income,
        expenses,
        savings
      });
    }

    return trends;
  }

  // Get category breakdown
  private static getCategoryBreakdown(expenses: any[]): any[] {
    const categoryMap = new Map();

    expenses.forEach(expense => {
      const categoryName = expense.category?.name || 'Other';
      const amount = Number(expense.debitAmount || 0);

      if (categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, categoryMap.get(categoryName) + amount);
      } else {
        categoryMap.set(categoryName, amount);
      }
    });

    const total = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0);
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

    return Array.from(categoryMap.entries()).map(([category, amount], index) => ({
      category,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: colors[index % colors.length]
    }));
  }

  // Detect user persona
  private static detectUserPersona(behavior: any): string {
    return PersonaService.detectPersona(behavior);
  }

  // Generate personalized insights
  private static generatePersonalizedInsights(data: any): string[] {
    const insights = [];

    if (data.savingsRate >= 20) {
      insights.push("🎉 Excellent savings rate! You're building a strong financial foundation.");
    } else if (data.savingsRate >= 10) {
      insights.push("👍 Good savings rate! Consider increasing it to 20% for better financial security.");
    } else {
      insights.push("💡 Your savings rate could be improved. Try the 50-30-20 rule for better budgeting.");
    }

    if (data.goals.length === 0) {
      insights.push("🎯 Set your first financial goal to start building wealth systematically.");
    } else if (data.goals.length >= 3) {
      insights.push("🚀 Great job! You have multiple financial goals. Keep tracking your progress.");
    }

    if (data.expenses.length < 10) {
      insights.push("📊 Track more expenses to get better insights into your spending patterns.");
    }

    return insights;
  }

  // Generate behavioral alerts
  private static generateBehavioralAlerts(data: any): any[] {
    const alerts = [];

    if (data.savingsRate < 10) {
      alerts.push({
        type: 'warning',
        message: `Your savings rate is ${data.savingsRate.toFixed(1)}%. Consider increasing it to at least 10% for better financial security.`,
        urgency: 'high'
      });
    }

    const overdueDeadlines = data.deadlines.filter((d: any) =>
      !d.isCompleted && d.dueDate < new Date()
    );
    if (overdueDeadlines.length > 0) {
      alerts.push({
        type: 'error',
        message: `You have ${overdueDeadlines.length} overdue deadline(s). Address them to avoid penalties.`,
        urgency: 'high'
      });
    }

    if (data.monthlyExpenses > data.monthlyIncome) {
      alerts.push({
        type: 'error',
        message: 'You\'re spending more than you earn. Review your expenses and create a budget.',
        urgency: 'critical'
      });
    }

    return alerts;
  }

  // Analyze spending patterns
  private static analyzeSpendingPatterns(expenses: any[]): {
    totalTransactions: number;
    averageTransaction: number;
    mostExpensiveCategory: string;
    spendingTrend: string;
    topCategories: Array<{ category: string; total: number }>;
  } {
    const patterns: {
      totalTransactions: number;
      averageTransaction: number;
      mostExpensiveCategory: string;
      spendingTrend: string;
      topCategories: Array<{ category: string; total: number }>;
    } = {
      totalTransactions: expenses.length,
      averageTransaction: 0,
      mostExpensiveCategory: '',
      spendingTrend: 'stable',
      topCategories: [],
    };

    if (expenses.length > 0) {
      const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.debitAmount || 0), 0);
      patterns.averageTransaction = totalAmount / expenses.length;

      // Find most expensive category
      const categoryMap = new Map();
      expenses.forEach(expense => {
        const category = expense.category?.name || 'Other';
        const amount = Number(expense.debitAmount || 0);
        categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
      });

      const sortedCategories = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1]);

      patterns.mostExpensiveCategory = sortedCategories[0]?.[0] || 'Other';
      patterns.topCategories = sortedCategories.slice(0, 3).map(([category, total]) => ({
        category,
        total,
      }));
    }

    return patterns;
  }

  // Calculate emergency fund months
  private static calculateEmergencyFundMonths(monthlyExpenses: number, goals: any[]): number {
    const emergencyGoal = goals.find(goal =>
      goal.title.toLowerCase().includes('emergency') ||
      goal.category?.toLowerCase().includes('emergency')
    );

    if (emergencyGoal) {
      const emergencyAmount = Number(emergencyGoal.currentAmount);
      return monthlyExpenses > 0 ? emergencyAmount / monthlyExpenses : 0;
    }

    return 0;
  }

  // Calculate debt-to-income ratio
  private static calculateDebtToIncomeRatio(monthlyIncome: number, expenses: any[]): number {
    // This is a simplified calculation - in reality, you'd need to identify debt payments
    const debtExpenses = expenses.filter(expense =>
      expense.category?.name?.toLowerCase().includes('loan') ||
      expense.category?.name?.toLowerCase().includes('debt') ||
      expense.description?.toLowerCase().includes('emi')
    );

    const monthlyDebt = debtExpenses.reduce((sum, expense) => sum + Number(expense.debitAmount || 0), 0);
    return monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;
  }

  // Generate financial milestones
  private static generateFinancialMilestones(data: any): any[] {
    const milestones = [];

    if (data.savingsRate >= 20) {
      milestones.push({
        title: 'Savings Champion',
        description: 'You\'re saving 20% or more of your income!',
        achieved: true,
        icon: '🏆'
      });
    }

    if (data.goals.length >= 3) {
      milestones.push({
        title: 'Goal Setter',
        description: 'You have 3 or more financial goals!',
        achieved: true,
        icon: '🎯'
      });
    }

    if (data.monthlyIncome > 50000) {
      milestones.push({
        title: 'High Earner',
        description: 'Your monthly income is above ₹50,000!',
        achieved: true,
        icon: '💰'
      });
    }

    return milestones;
  }

  // Get user's financial health assessment
  static async getFinancialHealthAssessment(userId: string): Promise<any> {
    const dashboardData = await this.getDashboardData(userId);

    return {
      score: dashboardData.financialHealthScore,
      category: dashboardData.financialHealthScore >= 75 ? 'excellent' :
        dashboardData.financialHealthScore >= 60 ? 'good' :
          dashboardData.financialHealthScore >= 40 ? 'fair' : 'poor',
      factors: {
        savingsRate: dashboardData.savingsRate,
        debtToIncome: dashboardData.debtToIncomeRatio,
        emergencyFund: dashboardData.emergencyFundMonths,
        goalSetting: dashboardData.activeGoals,
        expenseTracking: dashboardData.recentTransactions.length
      },
      recommendations: dashboardData.personalizedInsights,
      strengths: this.getStrengths(dashboardData),
      weaknesses: this.getWeaknesses(dashboardData)
    };
  }

  private static getStrengths(data: any): string[] {
    const strengths = [];

    if (data.savingsRate >= 20) strengths.push('Excellent savings rate');
    if (data.activeGoals >= 3) strengths.push('Multiple financial goals set');
    if (data.recentTransactions.length >= 20) strengths.push('Good expense tracking');
    if (data.upcomingDeadlines === 0) strengths.push('No overdue deadlines');

    return strengths;
  }

  private static getWeaknesses(data: any): string[] {
    const weaknesses = [];

    if (data.savingsRate < 10) weaknesses.push('Low savings rate');
    if (data.activeGoals === 0) weaknesses.push('No financial goals set');
    if (data.recentTransactions.length < 10) weaknesses.push('Limited expense tracking');
    if (data.emergencyFundMonths < 3) weaknesses.push('Insufficient emergency fund');

    return weaknesses;
  }
}
