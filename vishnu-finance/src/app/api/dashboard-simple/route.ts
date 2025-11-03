import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getCachedData, setCachedData, CACHE_TTL } from '../../../lib/api-cache';

// Cache key generator
function getCacheKey(userId: string, start: string, end: string): string {
  return `dashboard-simple:${userId}:${start}:${end}`;
}

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

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

    // Read optional date range; default to current month
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const rangeStart = startParam ? new Date(startParam) : defaultStart;
    const rangeEnd = endParam ? new Date(endParam) : defaultEnd;

    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(23, 59, 59, 999);

    // Check cache first
    const cacheKey = getCacheKey(userId, rangeStart.toISOString(), rangeEnd.toISOString());
    const cached = getCachedData(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // OPTIMIZATION 1: Use database aggregations instead of fetching all records
    // Get totals directly from database
    const [expenseStats, incomeStats, activeGoalsCount, upcomingDeadlinesCount, recentExpenses] = await Promise.all([
      // Expense aggregation - get total and count only
      prisma.expense.aggregate({
        where: {
          userId,
          isDeleted: false,
          date: { gte: rangeStart, lte: rangeEnd }
        },
        _sum: { amount: true },
        _count: true
      }),
      
      // Get only active income sources (we need these for calculations)
      prisma.incomeSource.findMany({
        where: { userId, isActive: true, isDeleted: false },
        select: {
          id: true,
          name: true,
          amount: true,
          frequency: true,
          startDate: true,
          category: { select: { name: true } }
        },
        orderBy: { startDate: 'desc' }
      }),
      
      // Goals count only
      prisma.goal.count({
        where: { userId, isActive: true }
      }),
      
      // Upcoming deadlines count (optimized query)
      prisma.deadline.count({
        where: {
          userId,
          isCompleted: false,
          dueDate: { gt: new Date() }
        }
      }),
      
      // Recent expenses - only last 10, only needed fields
      prisma.expense.findMany({
        where: {
          userId,
          isDeleted: false,
          date: { gte: rangeStart, lte: rangeEnd }
        },
        select: {
          id: true,
          description: true,
          amount: true,
          date: true,
          category: { select: { name: true } }
        },
        orderBy: { date: 'desc' },
        take: 10
      })
    ]);

    // OPTIMIZATION 2: Calculate totals using optimized logic
    const totalExpenses = Number(expenseStats._sum.amount || 0);
    
    // Calculate income more efficiently
    const rangeStartTime = rangeStart.getTime();
    const rangeEndTime = rangeEnd.getTime();
    const daysInRange = Math.ceil((rangeEndTime - rangeStartTime) / (1000 * 60 * 60 * 24)) + 1;
    
    const totalIncome = incomeStats.reduce((sum, source) => {
      const sourceDate = new Date(source.startDate);
      const sourceTime = sourceDate.getTime();
      
      if (sourceTime > rangeEndTime) return sum;
      
      const amount = Number(source.amount);
      
      if (source.frequency === 'ONE_TIME') {
        return (sourceTime >= rangeStartTime && sourceTime <= rangeEndTime) ? sum + amount : sum;
      }
      
      // For recurring, calculate effective period
      const effectiveStart = Math.max(rangeStartTime, sourceTime);
      const effectiveDays = Math.max(0, Math.ceil((rangeEndTime - effectiveStart) / (1000 * 60 * 60 * 24)) + 1);
      
      switch (source.frequency) {
        case 'MONTHLY':
          // More accurate: days in range / 30
          return sum + (amount * (effectiveDays / 30));
        case 'YEARLY':
          return sum + ((amount / 365) * effectiveDays);
        case 'WEEKLY':
          return sum + (amount * (effectiveDays / 7));
        case 'DAILY':
          return sum + (amount * effectiveDays);
        default:
      return sum;
      }
    }, 0);

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // OPTIMIZATION 3: Efficient monthly trends - group by month/week using date math
    const daysDiff = daysInRange - 1;
    const monthlyTrends: Array<{ month: string; income: number; expenses: number; savings: number }> = [];
    
    // Get expense totals grouped by date (single query)
    const expenseTotals = await prisma.expense.groupBy({
      by: ['date'],
      where: {
        userId,
        isDeleted: false,
        date: { gte: rangeStart, lte: rangeEnd }
      },
      _sum: { amount: true }
    });

    // Create expense map
    const expenseByDate = new Map<string, number>();
    expenseTotals.forEach(exp => {
      const dateKey = exp.date.toISOString().split('T')[0];
      expenseByDate.set(dateKey, Number(exp._sum.amount || 0));
    });

    // Pre-process income sources
    const oneTimeIncomes = new Map<string, number>();
    const recurringIncomes = incomeStats.filter(source => {
      const sourceDate = new Date(source.startDate);
      if (sourceDate > rangeEnd) return false;
      
      if (source.frequency === 'ONE_TIME' && sourceDate >= rangeStart && sourceDate <= rangeEnd) {
        const dateKey = sourceDate.toISOString().split('T')[0];
        oneTimeIncomes.set(dateKey, (oneTimeIncomes.get(dateKey) || 0) + Number(source.amount));
        return false;
      }
      return source.frequency !== 'ONE_TIME';
    });

    if (daysDiff <= 90) {
      // Weekly grouping - optimize iteration
      const weeks = Math.ceil(daysDiff / 7);
      let currentDate = new Date(rangeStart);
      
      for (let week = 0; week <= weeks && currentDate <= rangeEnd; week++) {
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const periodEnd = weekEnd > rangeEnd ? new Date(rangeEnd) : weekEnd;
        const periodStartTime = currentDate.getTime();
        const periodEndTime = periodEnd.getTime();
        
        // Aggregate expenses for this week
        let weekExpenses = 0;
        const checkDate = new Date(currentDate);
        while (checkDate <= periodEnd) {
          weekExpenses += expenseByDate.get(checkDate.toISOString().split('T')[0]) || 0;
          checkDate.setDate(checkDate.getDate() + 1);
        }
        
        // Calculate income for this week
        let weekIncome = 0;
        
        recurringIncomes.forEach(source => {
          const sourceTime = new Date(source.startDate).getTime();
          if (sourceTime > periodEndTime) return;
          
          const effectiveStart = Math.max(periodStartTime, sourceTime);
          const days = Math.max(0, Math.ceil((periodEndTime - effectiveStart) / (1000 * 60 * 60 * 24)) + 1);
          const amount = Number(source.amount);
          
          switch (source.frequency) {
            case 'MONTHLY':
              weekIncome += amount * (days / 30);
              break;
            case 'YEARLY':
              weekIncome += (amount / 365) * days;
              break;
            case 'WEEKLY':
              weekIncome += amount * (days / 7);
              break;
            case 'DAILY':
              weekIncome += amount * days;
              break;
          }
        });
        
        // Add one-time incomes
        const checkDateIncome = new Date(currentDate);
        while (checkDateIncome <= periodEnd) {
          weekIncome += oneTimeIncomes.get(checkDateIncome.toISOString().split('T')[0]) || 0;
          checkDateIncome.setDate(checkDateIncome.getDate() + 1);
        }
        
        monthlyTrends.push({
          month: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          income: weekIncome,
          expenses: weekExpenses,
          savings: weekIncome - weekExpenses
        });
        
        currentDate = new Date(periodEnd);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Monthly grouping - more efficient
      let currentMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
      
      while (currentMonth <= endMonth) {
        const monthStart = new Date(currentMonth);
        const plannedMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthEnd = plannedMonthEnd > rangeEnd ? new Date(rangeEnd) : plannedMonthEnd;
        const monthEndTime = monthEnd.getTime();
        
        // Aggregate expenses for this month
        let monthExpenses = 0;
        const checkDate = new Date(monthStart);
        while (checkDate <= monthEnd) {
          monthExpenses += expenseByDate.get(checkDate.toISOString().split('T')[0]) || 0;
          checkDate.setDate(checkDate.getDate() + 1);
        }
        
        // Calculate income for this month
        let monthIncome = 0;
        recurringIncomes.forEach(source => {
          const sourceTime = new Date(source.startDate).getTime();
          if (sourceTime > monthEndTime) return;
          
          const amount = Number(source.amount);
          switch (source.frequency) {
            case 'MONTHLY':
              monthIncome += amount;
              break;
            case 'YEARLY':
              monthIncome += amount / 12;
              break;
            case 'WEEKLY':
              monthIncome += amount * 4.33;
              break;
            case 'DAILY':
              monthIncome += amount * 30;
              break;
          }
        });
        
        // Add one-time incomes
        const checkDateIncome = new Date(monthStart);
        while (checkDateIncome <= monthEnd) {
          monthIncome += oneTimeIncomes.get(checkDateIncome.toISOString().split('T')[0]) || 0;
          checkDateIncome.setDate(checkDateIncome.getDate() + 1);
        }
        
        monthlyTrends.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          income: monthIncome,
          expenses: monthExpenses,
          savings: monthIncome - monthExpenses
        });
        
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }
    }

    // OPTIMIZATION 4: Category breakdown - use groupBy
    const categoryBreakdownData = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        isDeleted: false,
        date: { gte: rangeStart, lte: rangeEnd }
      },
      _sum: { amount: true }
    });

    // Get category names
    const categoryIds = categoryBreakdownData.map(c => c.categoryId).filter(Boolean) as string[];
    const categories = categoryIds.length > 0 ? await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true }
    }) : [];

    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    const categoryBreakdown = categoryBreakdownData
      .map(item => ({
        name: item.categoryId ? (categoryMap.get(item.categoryId) || 'Other') : 'Other',
        amount: Number(item._sum.amount || 0)
      }))
      .sort((a, b) => b.amount - a.amount);

    // Recent transactions
    const recentTransactions = recentExpenses.map(expense => ({
      id: expense.id,
      title: expense.description || 'Expense',
      amount: -Number(expense.amount),
      type: 'expense' as const,
      date: expense.date.toISOString().split('T')[0],
      category: expense.category?.name || 'Other'
    }));

    // Add income transactions (only ONE_TIME in range)
    const incomeTransactions = incomeStats
      .filter(income => {
        if (income.frequency !== 'ONE_TIME') return false;
        const incDate = new Date(income.startDate);
        return incDate >= rangeStart && incDate <= rangeEnd;
      })
      .map(income => ({
      id: income.id,
      title: income.name,
      amount: Number(income.amount),
        type: 'income' as const,
      date: income.startDate.toISOString().split('T')[0],
      category: income.category?.name || 'Income'
    }));

    const allTransactions = [...incomeTransactions, ...recentTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Financial health score
    let financialHealthScore = 0;
    if (savingsRate >= 20) financialHealthScore += 30;
    else if (savingsRate >= 10) financialHealthScore += 20;
    else if (savingsRate >= 5) financialHealthScore += 10;

    if (activeGoalsCount >= 3) financialHealthScore += 20;
    else if (activeGoalsCount >= 1) financialHealthScore += 10;

    if (expenseStats._count >= 30) financialHealthScore += 20;
    else if (expenseStats._count >= 10) financialHealthScore += 10;

    if (totalIncome > 0) financialHealthScore += 15;

    const result = {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate: Math.round(savingsRate * 100) / 100,
      upcomingDeadlines: upcomingDeadlinesCount,
      activeGoals: activeGoalsCount,
      recentTransactions: allTransactions,
      monthlyTrends,
      categoryBreakdown,
      financialHealthScore: Math.min(financialHealthScore, 100),
    };

    // Cache for 30 seconds
    setCachedData(cacheKey, result, CACHE_TTL.DASHBOARD);

    // Add cache-control headers for client-side caching
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('❌ Error in simple dashboard API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}