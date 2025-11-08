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

    // OPTIMIZATION 1: Use Transaction model aggregations with credit/debit breakdown
    // Get totals directly from database
    const [transactionStats, legacyExpenseStats, legacyIncomeStats, activeGoalsCount, upcomingDeadlinesCount, recentTransactions] = await Promise.all([
      // Transaction aggregation - get credit and debit totals separately
      // Check if Transaction model exists (it may not be migrated yet)
      (async () => {
        try {
          // Check if transaction table exists by trying to query it
          await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
          // If table exists, aggregate transactions
          return await (prisma as any).transaction.aggregate({
        where: {
          userId,
          isDeleted: false,
          transactionDate: { gte: rangeStart, lte: rangeEnd }
        },
        _sum: { 
          creditAmount: true,
          debitAmount: true
        },
        _count: true
          });
        } catch {
          // Transaction table doesn't exist yet or model not available
          console.log('⚠️ Transaction model not available, using empty stats');
          return { _sum: { creditAmount: 0, debitAmount: 0 }, _count: 0 };
        }
      })(),
      
      // Legacy expense aggregation (for backward compatibility)
      (prisma as any).expense.aggregate({
        where: {
          userId,
          date: { gte: rangeStart, lte: rangeEnd }
        },
        _sum: { amount: true },
        _count: true
      }).catch(() => ({ _sum: { amount: 0 }, _count: 0 })),
      
      // Legacy income sources (for backward compatibility and recurring calculations)
      (prisma as any).incomeSource.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          name: true,
          amount: true,
          frequency: true,
          startDate: true,
          category: { select: { name: true } }
        },
        orderBy: { startDate: 'desc' }
      }).catch(() => []),
      
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
      
      // Recent transactions - only last 10, only needed fields
      (async () => {
        try {
          await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
          return await (prisma as any).transaction.findMany({
        where: {
          userId,
          isDeleted: false,
          transactionDate: { gte: rangeStart, lte: rangeEnd }
        },
        select: {
          id: true,
          description: true,
          creditAmount: true,
          debitAmount: true,
          financialCategory: true,
          transactionDate: true,
          store: true,
          category: { select: { name: true } }
        },
        orderBy: { transactionDate: 'desc' },
        take: 10
          });
        } catch {
          return [];
        }
      })()
    ]);

    // OPTIMIZATION 2: Calculate totals using Transaction model (credits/debits)
    const totalCredits = Number(transactionStats._sum?.creditAmount || 0);
    const totalDebits = Number(transactionStats._sum?.debitAmount || 0);
    
    // Add legacy expenses/income for backward compatibility
    const legacyExpenses = Number(legacyExpenseStats._sum?.amount || 0);
    
    // Calculate legacy income more efficiently
    const rangeStartTime = rangeStart.getTime();
    const rangeEndTime = rangeEnd.getTime();
    const daysInRange = Math.ceil((rangeEndTime - rangeStartTime) / (1000 * 60 * 60 * 24)) + 1;
    
    const legacyIncome = legacyIncomeStats.reduce((sum: number, source: any) => {
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

    // Combine Transaction model totals with legacy totals
    const totalIncome = totalCredits + legacyIncome;
    const totalExpenses = totalDebits + legacyExpenses;
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    
    // Credit/Debit breakdown by financial category
    const categoryStats = await (async () => {
      try {
        await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
        return await (prisma as any).transaction.groupBy({
      by: ['financialCategory'],
      where: {
        userId,
        isDeleted: false,
        transactionDate: { gte: rangeStart, lte: rangeEnd }
      },
      _sum: {
        creditAmount: true,
        debitAmount: true
      }
        });
      } catch {
        return [];
      }
    })();
    
    const financialCategoryStatsMap = new Map();
    categoryStats.forEach((stat: any) => {
      financialCategoryStatsMap.set(stat.financialCategory, {
        credits: Number(stat._sum.creditAmount || 0),
        debits: Number(stat._sum.debitAmount || 0),
      });
    });

    // OPTIMIZATION 3: Efficient monthly trends - group by month/week using date math
    const daysDiff = daysInRange - 1;
    const monthlyTrends: Array<{ month: string; income: number; expenses: number; savings: number; credits: number; debits: number }> = [];
    
    // Get transaction totals grouped by date (single query)
    const transactionTotals = await (async () => {
      try {
        await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
        return await (prisma as any).transaction.groupBy({
      by: ['transactionDate'],
      where: {
        userId,
        isDeleted: false,
        transactionDate: { gte: rangeStart, lte: rangeEnd }
      },
      _sum: {
        creditAmount: true,
        debitAmount: true
      }
        });
      } catch {
        return [];
      }
    })();

    // Create credit/debit maps by date
    const creditsByDate = new Map<string, number>();
    const debitsByDate = new Map<string, number>();
    transactionTotals.forEach((t: any) => {
      const dateKey = t.transactionDate.toISOString().split('T')[0];
      creditsByDate.set(dateKey, (creditsByDate.get(dateKey) || 0) + Number(t._sum.creditAmount || 0));
      debitsByDate.set(dateKey, (debitsByDate.get(dateKey) || 0) + Number(t._sum.debitAmount || 0));
    });
    
    // Legacy expense map (for backward compatibility)
    const expenseTotals = await (prisma as any).expense.groupBy({
      by: ['date'],
      where: {
        userId,
        isDeleted: false,
        date: { gte: rangeStart, lte: rangeEnd }
      },
      _sum: { amount: true }
    }).catch(() => []);

    const expenseByDate = new Map<string, number>();
    expenseTotals.forEach((exp: any) => {
      const dateKey = exp.date.toISOString().split('T')[0];
      expenseByDate.set(dateKey, Number(exp._sum?.amount || 0));
    });

    // Pre-process legacy income sources
    const oneTimeIncomes = new Map<string, number>();
    const recurringIncomes = legacyIncomeStats.filter((source: any) => {
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
        
        // Aggregate credits/debits for this week from Transaction model
        let weekCredits = 0;
        let weekDebits = 0;
        const checkDate = new Date(currentDate);
        while (checkDate <= periodEnd) {
          const dateKey = checkDate.toISOString().split('T')[0];
          weekCredits += creditsByDate.get(dateKey) || 0;
          weekDebits += debitsByDate.get(dateKey) || 0;
          // Also add legacy expenses
          weekDebits += expenseByDate.get(dateKey) || 0;
          checkDate.setDate(checkDate.getDate() + 1);
        }
        
        // Calculate legacy income for this week
        let weekIncome = 0;
        
        recurringIncomes.forEach((source: any) => {
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
          income: weekCredits + weekIncome,
          expenses: weekDebits,
          savings: (weekCredits + weekIncome) - weekDebits,
          credits: weekCredits,
          debits: weekDebits
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
        
        // Aggregate credits/debits for this month from Transaction model
        let monthCredits = 0;
        let monthDebits = 0;
        const checkDate = new Date(monthStart);
        while (checkDate <= monthEnd) {
          const dateKey = checkDate.toISOString().split('T')[0];
          monthCredits += creditsByDate.get(dateKey) || 0;
          monthDebits += debitsByDate.get(dateKey) || 0;
          // Also add legacy expenses
          monthDebits += expenseByDate.get(dateKey) || 0;
          checkDate.setDate(checkDate.getDate() + 1);
        }
        
        // Calculate legacy income for this month
        let monthIncome = 0;
        recurringIncomes.forEach((source: any) => {
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
          income: monthCredits + monthIncome,
          expenses: monthDebits,
          savings: (monthCredits + monthIncome) - monthDebits,
          credits: monthCredits,
          debits: monthDebits
        });
        
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }
    }

    // OPTIMIZATION 4: Category breakdown - use groupBy on Transaction model
    const categoryBreakdownData = await (async () => {
      try {
        await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
        return await (prisma as any).transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        isDeleted: false,
        transactionDate: { gte: rangeStart, lte: rangeEnd }
      },
      _sum: { 
        debitAmount: true,
        creditAmount: true
      }
        });
      } catch {
        return [];
      }
    })();
    
    // Also get legacy expense category breakdown
    const legacyCategoryBreakdown = await (prisma as any).expense.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        isDeleted: false,
        date: { gte: rangeStart, lte: rangeEnd }
      },
      _sum: { amount: true }
    }).catch(() => []);

    // Get category names
    const allCategoryIds = [
      ...categoryBreakdownData.map((c: any) => c.categoryId),
      ...legacyCategoryBreakdown.map((c: any) => c.categoryId)
    ].filter(Boolean) as string[];
    const uniqueCategoryIds = [...new Set(allCategoryIds)];
    const categories = uniqueCategoryIds.length > 0 ? await prisma.category.findMany({
      where: { id: { in: uniqueCategoryIds } },
      select: { id: true, name: true }
    }) : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const categoryBreakdownMap = new Map<string, number>();
    
    // Combine Transaction and legacy expense amounts by category
    categoryBreakdownData.forEach((item: any) => {
      const categoryName = item.categoryId ? (categoryMap.get(item.categoryId) || 'Other') : 'Other';
      const total = Number(item._sum?.debitAmount || 0) + Number(item._sum?.creditAmount || 0);
      categoryBreakdownMap.set(categoryName, (categoryBreakdownMap.get(categoryName) || 0) + total);
    });
    
    legacyCategoryBreakdown.forEach((item: any) => {
      const categoryName = item.categoryId ? (categoryMap.get(item.categoryId) || 'Other') : 'Other';
      categoryBreakdownMap.set(categoryName, (categoryBreakdownMap.get(categoryName) || 0) + Number(item._sum?.amount || 0));
    });
    
    const categoryBreakdown = Array.from(categoryBreakdownMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Recent transactions from Transaction model (may be empty if table doesn't exist)
    const recentTrans = (recentTransactions || []).map((t: any) => {
      const isCredit = Number(t.creditAmount || 0) > 0;
      return {
        id: t.id,
        title: t.description || (isCredit ? 'Credit' : 'Debit'),
        amount: isCredit ? Number(t.creditAmount) : -Number(t.debitAmount),
        type: isCredit ? 'credit' : 'debit',
        date: t.transactionDate.toISOString().split('T')[0],
        category: t.category?.name || t.financialCategory || 'Other',
        financialCategory: t.financialCategory,
        store: t.store || null
      };
    });

    // Add legacy income transactions (only ONE_TIME in range)
    const incomeTransactions = legacyIncomeStats
      .filter((income: any) => {
        if (income.frequency !== 'ONE_TIME') return false;
        const incDate = new Date(income.startDate);
        return incDate >= rangeStart && incDate <= rangeEnd;
      })
      .map((income: any) => ({
        id: income.id,
        title: income.name,
        amount: Number(income.amount),
        type: 'income' as 'income' | 'credit' | 'debit',
        date: income.startDate.toISOString().split('T')[0],
        category: 'Income'
      }));

    const allTransactions = [...incomeTransactions, ...recentTrans]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Financial health score
    let financialHealthScore = 0;
    if (savingsRate >= 20) financialHealthScore += 30;
    else if (savingsRate >= 10) financialHealthScore += 20;
    else if (savingsRate >= 5) financialHealthScore += 10;

    if (activeGoalsCount >= 3) financialHealthScore += 20;
    else if (activeGoalsCount >= 1) financialHealthScore += 10;

    const totalTransactionCount = transactionStats._count || 0;
    const legacyExpenseCount = legacyExpenseStats._count || 0;
    if (totalTransactionCount + legacyExpenseCount >= 30) financialHealthScore += 20;
    else if (totalTransactionCount + legacyExpenseCount >= 10) financialHealthScore += 10;

    if (totalIncome > 0) financialHealthScore += 15;

    const result = {
      totalIncome,
      totalExpenses,
      // Banking terminology breakdown
      totalCredits,
      totalDebits,
      netSavings,
      savingsRate: Math.round(savingsRate * 100) / 100,
      upcomingDeadlines: upcomingDeadlinesCount,
      activeGoals: activeGoalsCount,
      recentTransactions: allTransactions,
      monthlyTrends,
      categoryBreakdown,
      financialHealthScore: Math.min(financialHealthScore, 100),
      // Financial category breakdown
      categoryStats: Object.fromEntries(financialCategoryStatsMap),
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