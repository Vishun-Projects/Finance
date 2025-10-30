// Enhanced AI Financial Assistant with advanced insights and recommendations
import { prisma } from './db';

export interface FinancialInsight {
  type: 'saving' | 'spending' | 'investment' | 'debt' | 'goal' | 'risk';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: string;
  impact: string;
  confidence: number; // 0-100
  data: any;
}

export interface FinancialRecommendation {
  category: string;
  title: string;
  description: string;
  potentialSavings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  steps: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FinancialHealth {
  score: number; // 0-100
  category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  factors: {
    savingsRate: number;
    debtToIncome: number;
    emergencyFund: number;
    investmentRatio: number;
    spendingControl: number;
  };
  recommendations: string[];
}

export class AIFinancialAssistant {
  // Analyze user's financial data and generate insights
  static async analyzeFinancialHealth(userId: string): Promise<FinancialHealth> {
    try {
      // Get user's financial data
      const [income, expenses, goals, deadlines] = await Promise.all([
        prisma.incomeSource.findMany({
          where: { userId, isActive: true },
          select: { amount: true, frequency: true }
        }),
        prisma.expense.findMany({
          where: { userId },
          select: { amount: true, date: true, description: true }
        }),
        prisma.goal.findMany({
          where: { userId, isActive: true },
          select: { targetAmount: true, currentAmount: true, targetDate: true }
        }),
        prisma.deadline.findMany({
          where: { userId, isCompleted: false },
          select: { amount: true, dueDate: true }
        })
      ]);

      // Calculate financial metrics
      const totalIncome = this.calculateTotalIncome(income);
      const totalExpenses = this.calculateTotalExpenses(expenses);
      const netSavings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

      // Calculate debt-to-income ratio
      const totalDebt = deadlines.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
      const debtToIncome = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;

      // Calculate emergency fund adequacy
      const monthlyExpenses = totalExpenses / 12; // Assuming yearly data
      const emergencyFundMonths = monthlyExpenses > 0 ? netSavings / monthlyExpenses : 0;

      // Calculate investment ratio
      const investmentGoals = goals.filter(g => g.targetDate && new Date(g.targetDate) > new Date());
      const totalInvestmentTarget = investmentGoals.reduce((sum, g) => sum + parseFloat(g.targetAmount.toString()), 0);
      const investmentRatio = totalIncome > 0 ? (totalInvestmentTarget / totalIncome) * 100 : 0;

      // Calculate spending control score
      const spendingControl = this.calculateSpendingControl(expenses);

      // Calculate overall financial health score
      const healthScore = this.calculateHealthScore({
        savingsRate,
        debtToIncome,
        emergencyFund: emergencyFundMonths,
        investmentRatio,
        spendingControl
      });

      // Generate recommendations
      const recommendations = this.generateHealthRecommendations({
        savingsRate,
        debtToIncome,
        emergencyFund: emergencyFundMonths,
        investmentRatio,
        spendingControl
      });

      return {
        score: healthScore,
        category: this.getHealthCategory(healthScore),
        factors: {
          savingsRate,
          debtToIncome,
          emergencyFund: emergencyFundMonths,
          investmentRatio,
          spendingControl
        },
        recommendations
      };
    } catch (error) {
      console.error('Error analyzing financial health:', error);
      throw new Error('Failed to analyze financial health');
    }
  }

  // Generate personalized insights
  static async generateInsights(userId: string): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = [];

    try {
      // Get recent financial data
      const [recentExpenses, goals, income] = await Promise.all([
        prisma.expense.findMany({
          where: { userId },
          orderBy: { date: 'desc' },
          take: 30,
          select: { amount: true, date: true, description: true, categoryId: true }
        }),
        prisma.goal.findMany({
          where: { userId, isActive: true },
          select: { title: true, targetAmount: true, currentAmount: true, targetDate: true }
        }),
        prisma.incomeSource.findMany({
          where: { userId, isActive: true },
          select: { amount: true, frequency: true }
        })
      ]);

      // Analyze spending patterns
      const spendingInsights = this.analyzeSpendingPatterns(recentExpenses);
      insights.push(...spendingInsights);

      // Analyze goal progress
      const goalInsights = this.analyzeGoalProgress(goals);
      insights.push(...goalInsights);

      // Analyze income stability
      const incomeInsights = this.analyzeIncomeStability(income);
      insights.push(...incomeInsights);

      // Analyze savings opportunities
      const savingsInsights = this.analyzeSavingsOpportunities(recentExpenses, income);
      insights.push(...savingsInsights);

      return insights.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      return [];
    }
  }

  // Generate personalized recommendations
  static async generateRecommendations(userId: string): Promise<FinancialRecommendation[]> {
    const recommendations: FinancialRecommendation[] = [];

    try {
      // Get user's financial data
      const [expenses, goals, income] = await Promise.all([
        prisma.expense.findMany({
          where: { userId },
          select: { amount: true, description: true, date: true }
        }),
        prisma.goal.findMany({
          where: { userId, isActive: true },
          select: { title: true, targetAmount: true, currentAmount: true }
        }),
        prisma.incomeSource.findMany({
          where: { userId, isActive: true },
          select: { amount: true, frequency: true }
        })
      ]);

      // Generate spending optimization recommendations
      const spendingRecs = this.generateSpendingRecommendations(expenses);
      recommendations.push(...spendingRecs);

      // Generate investment recommendations
      const investmentRecs = this.generateInvestmentRecommendations(goals, income);
      recommendations.push(...investmentRecs);

      // Generate debt management recommendations
      const debtRecs = this.generateDebtRecommendations(expenses, income);
      recommendations.push(...debtRecs);

      return recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  // Predict future financial trends
  static async predictTrends(userId: string, months: number = 6): Promise<any> {
    try {
      const [historicalExpenses, historicalIncome] = await Promise.all([
        prisma.expense.findMany({
          where: { userId },
          orderBy: { date: 'desc' },
          take: 100,
          select: { amount: true, date: true }
        }),
        prisma.incomeSource.findMany({
          where: { userId, isActive: true },
          select: { amount: true, frequency: true }
        })
      ]);

      // Simple trend analysis (in production, use more sophisticated ML models)
      const expenseTrend = this.calculateTrend(historicalExpenses);
      const incomeTrend = this.calculateIncomeTrend(historicalIncome);

      const predictions = [];
      const currentDate = new Date();

      for (let i = 1; i <= months; i++) {
        const futureDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
        const predictedExpenses = this.predictValue(historicalExpenses, i, expenseTrend);
        const predictedIncome = this.predictValue(historicalIncome, i, incomeTrend);

        predictions.push({
          month: futureDate.toISOString().slice(0, 7),
          predictedIncome: predictedIncome,
          predictedExpenses: predictedExpenses,
          predictedSavings: predictedIncome - predictedExpenses,
          confidence: Math.max(0, 100 - (i * 10)) // Decreasing confidence over time
        });
      }

      return {
        predictions,
        trends: {
          expense: expenseTrend,
          income: incomeTrend
        },
        accuracy: this.calculatePredictionAccuracy(historicalExpenses, historicalIncome)
      };
    } catch (error) {
      console.error('Error predicting trends:', error);
      return { predictions: [], trends: {}, accuracy: 0 };
    }
  }

  // Private helper methods
  private static calculateTotalIncome(income: any[]): number {
    return income.reduce((sum, item) => {
      const amount = parseFloat(item.amount.toString());
      const multiplier = this.getFrequencyMultiplier(item.frequency);
      return sum + (amount * multiplier);
    }, 0);
  }

  private static calculateTotalExpenses(expenses: any[]): number {
    return expenses.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
  }

  private static getFrequencyMultiplier(frequency: string): number {
    switch (frequency) {
      case 'DAILY': return 365;
      case 'WEEKLY': return 52;
      case 'MONTHLY': return 12;
      case 'YEARLY': return 1;
      default: return 12; // Default to monthly
    }
  }

  private static calculateSpendingControl(expenses: any[]): number {
    // Analyze spending consistency and control
    if (expenses.length < 10) return 50; // Not enough data

    const amounts = expenses.map(e => parseFloat(e.amount.toString()));
    const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - average, 2), 0) / amounts.length;
    const coefficient = Math.sqrt(variance) / average;

    // Lower coefficient = better spending control
    return Math.max(0, Math.min(100, 100 - (coefficient * 100)));
  }

  private static calculateHealthScore(factors: any): number {
    const weights = {
      savingsRate: 0.3,
      debtToIncome: 0.25,
      emergencyFund: 0.2,
      investmentRatio: 0.15,
      spendingControl: 0.1
    };

    let score = 0;
    
    // Savings rate score (0-100)
    score += Math.min(100, Math.max(0, factors.savingsRate * 2)) * weights.savingsRate;
    
    // Debt-to-income score (inverted)
    score += Math.max(0, 100 - factors.debtToIncome) * weights.debtToIncome;
    
    // Emergency fund score
    score += Math.min(100, factors.emergencyFund * 20) * weights.emergencyFund;
    
    // Investment ratio score
    score += Math.min(100, factors.investmentRatio) * weights.investmentRatio;
    
    // Spending control score
    score += factors.spendingControl * weights.spendingControl;

    return Math.round(score);
  }

  private static getHealthCategory(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  private static generateHealthRecommendations(factors: any): string[] {
    const recommendations: string[] = [];

    if (factors.savingsRate < 20) {
      recommendations.push('Increase your savings rate to at least 20% of your income');
    }

    if (factors.debtToIncome > 30) {
      recommendations.push('Focus on reducing your debt-to-income ratio below 30%');
    }

    if (factors.emergencyFund < 3) {
      recommendations.push('Build an emergency fund covering at least 3 months of expenses');
    }

    if (factors.investmentRatio < 10) {
      recommendations.push('Consider increasing your investment allocation to at least 10% of income');
    }

    if (factors.spendingControl < 70) {
      recommendations.push('Work on more consistent spending patterns and budgeting');
    }

    return recommendations;
  }

  private static analyzeSpendingPatterns(expenses: any[]): FinancialInsight[] {
    const insights: FinancialInsight[] = [];

    // Analyze spending trends
    const monthlySpending = this.groupByMonth(expenses);
    const spendingTrend = this.calculateTrend(monthlySpending);

    if (spendingTrend > 0.1) {
      insights.push({
        type: 'spending',
        priority: 'high',
        title: 'Rising Spending Trend',
        description: 'Your spending has increased significantly over the past month',
        action: 'Review your recent expenses and identify areas to cut back',
        impact: 'Could impact your savings goals',
        confidence: 85,
        data: { trend: spendingTrend }
      });
    }

    return insights;
  }

  private static analyzeGoalProgress(goals: any[]): FinancialInsight[] {
    const insights: FinancialInsight[] = [];

    for (const goal of goals) {
      const progress = parseFloat(goal.currentAmount.toString()) / parseFloat(goal.targetAmount.toString());
      const targetDate = new Date(goal.targetDate);
      const now = new Date();
      const timeRemaining = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30); // months

      if (progress < 0.5 && timeRemaining < 6) {
        insights.push({
          type: 'goal',
          priority: 'high',
          title: `Goal Behind Schedule: ${goal.title}`,
          description: `You're behind on your goal progress with only ${Math.round(progress * 100)}% completed`,
          action: 'Increase your monthly contributions or adjust your timeline',
          impact: 'May not reach your goal on time',
          confidence: 90,
          data: { goal, progress, timeRemaining }
        });
      }
    }

    return insights;
  }

  private static analyzeIncomeStability(income: any[]): FinancialInsight[] {
    const insights: FinancialInsight[] = [];

    if (income.length === 1 && income[0].frequency === 'ONE_TIME') {
      insights.push({
        type: 'risk',
        priority: 'medium',
        title: 'Single Income Source',
        description: 'You have only one income source, which creates financial risk',
        action: 'Consider diversifying your income streams',
        impact: 'Reduces financial stability',
        confidence: 80,
        data: { incomeSources: income.length }
      });
    }

    return insights;
  }

  private static analyzeSavingsOpportunities(expenses: any[], income: any[]): FinancialInsight[] {
    const insights: FinancialInsight[] = [];

    // Find high-value expenses that could be optimized
    const highExpenses = expenses
      .filter(e => parseFloat(e.amount.toString()) > 1000)
      .sort((a, b) => parseFloat(b.amount.toString()) - parseFloat(a.amount.toString()))
      .slice(0, 3);

    if (highExpenses.length > 0) {
      insights.push({
        type: 'saving',
        priority: 'medium',
        title: 'High-Value Expense Opportunities',
        description: 'You have several high-value expenses that could be optimized',
        action: 'Review these expenses and look for better deals or alternatives',
        impact: 'Could save significant money',
        confidence: 75,
        data: { highExpenses }
      });
    }

    return insights;
  }

  private static generateSpendingRecommendations(expenses: any[]): FinancialRecommendation[] {
    const recommendations: FinancialRecommendation[] = [];

    // Analyze expense categories
    const categoryAnalysis = this.analyzeExpenseCategories(expenses);

    for (const [category, data] of Object.entries(categoryAnalysis)) {
      if (data.amount > 1000 && data.count > 5) {
        recommendations.push({
          category: 'Spending Optimization',
          title: `Optimize ${category} Expenses`,
          description: `You spend ₹${data.amount.toLocaleString()} on ${category} with ${data.count} transactions`,
          potentialSavings: data.amount * 0.15, // Assume 15% savings potential
          difficulty: 'medium',
          timeframe: '1-2 months',
          steps: [
            'Review all transactions in this category',
            'Look for subscription services you can cancel',
            'Find cheaper alternatives or negotiate better rates',
            'Set a monthly budget for this category'
          ],
          riskLevel: 'low'
        });
      }
    }

    return recommendations;
  }

  private static generateInvestmentRecommendations(goals: any[], income: any[]): FinancialRecommendation[] {
    const recommendations: FinancialRecommendation[] = [];

    const totalIncome = this.calculateTotalIncome(income);
    const investmentGoals = goals.filter(g => g.targetDate && new Date(g.targetDate) > new Date());
    
    if (investmentGoals.length > 0 && totalIncome > 0) {
      const investmentRatio = (investmentGoals.reduce((sum, g) => sum + parseFloat(g.targetAmount.toString()), 0) / totalIncome) * 100;
      
      if (investmentRatio < 10) {
        recommendations.push({
          category: 'Investment',
          title: 'Increase Investment Allocation',
          description: 'Your investment allocation is below recommended levels',
          potentialSavings: totalIncome * 0.05, // 5% of income
          difficulty: 'easy',
          timeframe: 'Immediate',
          steps: [
            'Set up automatic monthly investments',
            'Consider SIPs in mutual funds',
            'Start with 5% of your income',
            'Gradually increase to 10-15%'
          ],
          riskLevel: 'low'
        });
      }
    }

    return recommendations;
  }

  private static generateDebtRecommendations(expenses: any[], income: any[]): FinancialRecommendation[] {
    const recommendations: FinancialRecommendation[] = [];

    // This would need actual debt data from the database
    // For now, return empty array
    return recommendations;
  }

  private static analyzeExpenseCategories(expenses: any[]): Record<string, { amount: number; count: number }> {
    const categories: Record<string, { amount: number; count: number }> = {};

    for (const expense of expenses) {
      const category = expense.description || 'Other';
      const amount = parseFloat(expense.amount.toString());

      if (!categories[category]) {
        categories[category] = { amount: 0, count: 0 };
      }

      categories[category].amount += amount;
      categories[category].count += 1;
    }

    return categories;
  }

  private static groupByMonth(expenses: any[]): any[] {
    const monthly: Record<string, number> = {};

    for (const expense of expenses) {
      const month = new Date(expense.date).toISOString().slice(0, 7);
      monthly[month] = (monthly[month] || 0) + parseFloat(expense.amount.toString());
    }

    return Object.entries(monthly).map(([month, amount]) => ({ month, amount }));
  }

  private static calculateTrend(data: any[]): number {
    if (data.length < 2) return 0;

    const values = data.map(d => d.amount || d);
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private static calculateIncomeTrend(income: any[]): number {
    // For income, we'll use a simple calculation based on frequency
    return income.length > 1 ? 0.05 : 0; // Assume 5% growth if multiple sources
  }

  private static predictValue(data: any[], months: number, trend: number): number {
    if (data.length === 0) return 0;

    const average = data.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0) / data.length;
    return average * (1 + trend * months);
  }

  private static calculatePredictionAccuracy(expenses: any[], income: any[]): number {
    // Simple accuracy calculation based on data availability
    const dataPoints = expenses.length + income.length;
    return Math.min(100, Math.max(50, dataPoints * 2));
  }
}
