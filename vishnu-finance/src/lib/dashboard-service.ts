import { prisma } from './db';
import { getCachedData, setCachedData, CACHE_TTL } from './api-cache';

interface DashboardStatsParams {
    userId: string;
    startDate: Date;
    endDate: Date;
}
export interface SimpleDashboardData {
    totalIncome: number;
    totalExpenses: number;
    totalCredits: number;
    totalDebits: number;
    netSavings: number;
    totalNetWorth: number;
    savingsRate: number;
    upcomingDeadlines: number;
    activeGoals: number;
    recentTransactions: Array<{
        id: string;
        title: string;
        amount: number;
        type: 'income' | 'expense' | 'credit' | 'debit';
        category: string;
        date: string;
        financialCategory?: string;
        store?: string | null;
    }>;
    monthlyTrends: Array<{
        month: string;
        income: number;
        expenses: number;
        savings: number;
        credits: number;
        debits: number;
    }>;
    categoryBreakdown: Array<{
        name: string;
        amount: number;
    }>;
    financialHealthScore: number;
    categoryStats: Record<string, { credits: number; debits: number }>;
    // NEW: Additional KPI data
    salaryInfo: {
        takeHome: number;
        ctc: number;
        jobTitle: string;
        company: string;
    } | null;
    plansInfo: {
        activePlans: number;
        totalCommitted: number;
        topPlan: string | null;
        items: Array<{ name: string; targetAmount: number; currentAmount: number; priority?: number }>;
    };
    wishlistInfo: {
        totalItems: number;
        totalCost: number;
        topItem: string | null;
        items: Array<{ name: string; estimatedPrice: number; priority?: number }>;
    };
    deadlinesInfo: {
        upcoming: number;
        nextDeadline: { title: string; dueDate: string } | null;
        items: Array<{ title: string; dueDate: string }>;
    };
}

export class DashboardService {
    async getSimpleStats({ userId, startDate, endDate }: DashboardStatsParams): Promise<SimpleDashboardData> {
        const rangeStart = startDate;
        const rangeEnd = endDate;

        // Cache Optimization
        const cacheKey = `dashboard_stats:${userId}:${rangeStart.toISOString()}:${rangeEnd.toISOString()}`;
        const cached = await getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        // Direct Database Aggregations
        const [
            transactionStats,
            legacyExpenseStats,
            legacyIncomeStats,
            activeGoalsCount,
            deadlinesData,
            recentTransactions,
            salaryInfo,
            plansInfo,
            wishlistInfo,
            netWorthStats,
            categoryStatsData,
            transactionTotalsData,
            categoryBreakdownRaw
        ] = await Promise.all([
            // 1. Transaction Stats
            (async () => {
                try {
                    return await (prisma as any).transaction.aggregate({
                        where: {
                            userId,
                            isDeleted: false,
                            transactionDate: { gte: rangeStart, lte: rangeEnd }
                        },
                        _sum: { creditAmount: true, debitAmount: true },
                        _count: true
                    });
                } catch {
                    return { _sum: { creditAmount: 0, debitAmount: 0 }, _count: 0 };
                }
            })(),

            // 2. Legacy Expenses (Removed)
            Promise.resolve({ _sum: { amount: 0 }, _count: 0 }),

            // 3. Legacy Income (Removed)
            Promise.resolve([]),

            // 4. Goals
            prisma.goal.count({ where: { userId, isActive: true } }).catch(() => 0),

            // 5. Deadlines with top items
            (async () => {
                try {
                    const deadlines = await prisma.deadline.findMany({
                        where: { userId, isCompleted: false },
                        orderBy: { dueDate: 'asc' },
                        select: { title: true, dueDate: true },
                        take: 20
                    });
                    return {
                        count: deadlines.length,
                        next: deadlines[0] || null,
                        items: deadlines.map((d: any) => ({ title: d.title, dueDate: d.dueDate.toISOString() }))
                    };
                } catch { return { count: 0, next: null, items: [] }; }
            })(),

            // 6. Recent Transactions
            (async () => {
                try {
                    return await (prisma as any).transaction.findMany({
                        where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                        select: {
                            id: true, description: true, creditAmount: true, debitAmount: true,
                            financialCategory: true, transactionDate: true, store: true,
                            category: { select: { name: true } }
                        },
                        orderBy: { transactionDate: 'desc' },
                        take: 10
                    });
                } catch { return []; }
            })(),

            // 7. Active Salary Structure
            (async () => {
                try {
                    const salary = await (prisma as any).salaryStructure.findFirst({
                        where: { userId, isActive: true },
                        select: {
                            baseSalary: true, jobTitle: true, company: true,
                            allowances: true, deductions: true, employerContributions: true
                        }
                    });
                    if (!salary) return null;
                    const allowances = typeof salary.allowances === 'string' ? JSON.parse(salary.allowances || '{}') : (salary.allowances || {});
                    const deductions = typeof salary.deductions === 'string' ? JSON.parse(salary.deductions || '{}') : (salary.deductions || {});
                    const contributions = typeof salary.employerContributions === 'string' ? JSON.parse(salary.employerContributions || '{}') : (salary.employerContributions || {});
                    const totalAllowances = Object.values(allowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                    const totalDeductions = Object.values(deductions).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                    const totalContributions = Object.values(contributions).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                    const monthlyBase = Number(salary.baseSalary) / 12;
                    const grossMonthly = monthlyBase + totalAllowances;
                    const netMonthly = grossMonthly - totalDeductions;
                    const ctc = (grossMonthly + totalContributions) * 12;
                    return { takeHome: netMonthly, ctc, jobTitle: salary.jobTitle, company: salary.company };
                } catch { return null; }
            })(),

            // 8. Active Plans (Goals) with details
            (async () => {
                try {
                    const goals = await prisma.goal.findMany({
                        where: { userId, isActive: true },
                        select: { title: true, targetAmount: true, currentAmount: true, priority: true },
                        orderBy: { priority: 'asc' },
                        take: 20
                    });
                    const totalCommitted = goals.reduce((sum: number, p: any) => sum + (Number(p.targetAmount) || 0), 0);
                    return {
                        activePlans: goals.length,
                        totalCommitted,
                        topPlan: goals[0]?.title || null,
                        items: goals.map((p: any) => ({
                            name: p.title,
                            targetAmount: Number(p.targetAmount) || 0,
                            currentAmount: Number(p.currentAmount) || 0,
                            priority: p.priority === 'CRITICAL' ? 1 : p.priority === 'HIGH' ? 2 : p.priority === 'MEDIUM' ? 3 : 4
                        }))
                    };
                } catch { return { activePlans: 0, totalCommitted: 0, topPlan: null, items: [] }; }
            })(),

            // 9. Wishlist Summary with details
            (async () => {
                try {
                    const items = await (prisma as any).wishlistItem.findMany({
                        where: { userId },
                        select: { title: true, estimatedCost: true, priority: true },
                        orderBy: { priority: 'asc' },
                        take: 20
                    });
                    const totalCost = items.reduce((sum: number, i: any) => sum + (Number(i.estimatedCost) || 0), 0);
                    return {
                        totalItems: items.length,
                        totalCost,
                        topItem: items[0]?.title || null,
                        items: items.map((i: any) => ({
                            name: i.title,
                            estimatedPrice: Number(i.estimatedCost) || 0,
                            priority: i.priority === 'HIGH' ? 1 : i.priority === 'MEDIUM' ? 2 : 3
                        }))
                    };
                } catch { return { totalItems: 0, totalCost: 0, topItem: null, items: [] }; }
            })(),

            // 10. Total Net Worth (All Time)
            (async () => {
                try {
                    return await (prisma as any).transaction.aggregate({
                        where: { userId, isDeleted: false },
                        _sum: { creditAmount: true, debitAmount: true }
                    });
                } catch { return { _sum: { creditAmount: 0, debitAmount: 0 } }; }
            })(),

            // 11. Category Stats
            (async () => {
                try {
                    return await (prisma as any).transaction.groupBy({
                        by: ['financialCategory'],
                        where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                        _sum: { creditAmount: true, debitAmount: true }
                    });
                } catch { return []; }
            })(),

            // 12. Transaction Totals (Trends)
            (async () => {
                try {
                    return await (prisma as any).transaction.groupBy({
                        by: ['transactionDate'],
                        where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                        _sum: { creditAmount: true, debitAmount: true }
                    });
                } catch { return []; }
            })(),

            // 13. Category Breakdown
            (async () => {
                try {
                    return await (prisma as any).transaction.groupBy({
                        by: ['categoryId'],
                        where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                        _sum: { debitAmount: true, creditAmount: true }
                    });
                } catch { return []; }
            })()
        ]);


        // Totals Calculation
        const totalCredits = Number(transactionStats._sum?.creditAmount || 0);
        const totalDebits = Number(transactionStats._sum?.debitAmount || 0);
        const legacyExpenses = Number(legacyExpenseStats._sum?.amount || 0);

        // Legacy Income Calculation (Skipped)
        const legacyIncome = 0;

        const totalIncome = totalCredits + legacyIncome;
        const totalExpenses = totalDebits + legacyExpenses;
        const netSavings = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

        const totalNetWorth = (Number(netWorthStats._sum?.creditAmount || 0) + legacyIncome) - (Number(netWorthStats._sum?.debitAmount || 0) + legacyExpenses);

        // Category Stats
        const financialCategoryStatsMap = new Map();
        (categoryStatsData as any[]).forEach((stat: any) => {
            financialCategoryStatsMap.set(stat.financialCategory, {
                credits: Number(stat._sum.creditAmount || 0),
                debits: Number(stat._sum.debitAmount || 0),
            });
        });

        const transactionTotals = transactionTotalsData;

        // Monthly Trends Logic
        const diffDays = Math.ceil(Math.abs(rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
        const isDaily = diffDays <= 65; // Use daily points for shorter ranges
        const monthlyTrends: SimpleDashboardData['monthlyTrends'] = [];

        const trendPoints = new Map<string, { income: number, expenses: number, credits: number, debits: number }>();

        // Generate date range points
        const current = new Date(rangeStart);
        while (current <= rangeEnd) {
            const key = isDaily
                ? current.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
                : current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

            if (!trendPoints.has(key)) {
                trendPoints.set(key, { income: 0, expenses: 0, credits: 0, debits: 0 });
            }

            if (isDaily) current.setDate(current.getDate() + 1);
            else current.setMonth(current.getMonth() + 1);
        }

        // Aggregate actual transactions into buckets
        transactionTotals.forEach((stat: any) => {
            const d = new Date(stat.transactionDate);
            const key = isDaily
                ? d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
                : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

            const bucket = trendPoints.get(key);
            if (bucket) {
                bucket.credits += Number(stat._sum.creditAmount || 0);
                bucket.debits += Number(stat._sum.debitAmount || 0);
            }
        });

        // Add legacy income/expenses (proportionalized)
        // For simplicity, we split legacy items evenly across the range
        const totalPoints = trendPoints.size || 1;
        const legacyIncomePerPoint = legacyIncome / totalPoints;
        const legacyExpensePerPoint = legacyExpenses / totalPoints;

        trendPoints.forEach((val, key) => {
            monthlyTrends.push({
                month: key,
                income: val.credits + legacyIncomePerPoint,
                expenses: val.debits + legacyExpensePerPoint,
                credits: val.credits,
                debits: val.debits,
                savings: (val.credits + legacyIncomePerPoint) - (val.debits + legacyExpensePerPoint)
            });
        });

        // Category Breakdown Logic
        const categoryBreakdown: SimpleDashboardData['categoryBreakdown'] = (categoryBreakdownRaw as any[]).map(item => ({
            name: item.categoryId || 'Uncategorized',
            amount: Number(item._sum.debitAmount || 0)
        }));

        // Recent Transactions Formatting
        const recentTrans = (recentTransactions || []).map((t: { id: string, description: string | null, creditAmount: any, debitAmount: any, financialCategory: string | null, transactionDate: Date, store: string | null, category?: { name: string } | null }) => {
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

        // Legacy Income Trans logic (Skipped)
        const incomeTransactions: any[] = [];

        const allTransactions = [...incomeTransactions, ...recentTrans]
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);

        // Health Score
        let financialHealthScore = 0;
        if (savingsRate >= 20) financialHealthScore += 30;
        else if (savingsRate >= 10) financialHealthScore += 20;
        else if (savingsRate >= 5) financialHealthScore += 10;
        if (activeGoalsCount >= 3) financialHealthScore += 20;
        else if (activeGoalsCount >= 1) financialHealthScore += 10;
        if ((transactionStats._count || 0) + (legacyExpenseStats._count || 0) >= 30) financialHealthScore += 20;
        else if ((transactionStats._count || 0) + (legacyExpenseStats._count || 0) >= 10) financialHealthScore += 10;
        if (totalIncome > 0) financialHealthScore += 15;


        const result = {
            totalIncome,
            totalExpenses,
            totalCredits,
            totalDebits,
            netSavings,
            totalNetWorth,
            savingsRate: Math.round(savingsRate * 100) / 100,
            upcomingDeadlines: deadlinesData?.count || 0,
            activeGoals: activeGoalsCount,
            recentTransactions: allTransactions,
            monthlyTrends,
            categoryBreakdown,
            financialHealthScore: Math.min(financialHealthScore, 100),
            categoryStats: Object.fromEntries(financialCategoryStatsMap),
            // NEW KPI data
            salaryInfo: salaryInfo || null,
            plansInfo: plansInfo || { activePlans: 0, totalCommitted: 0, topPlan: null, items: [] },
            wishlistInfo: wishlistInfo || { totalItems: 0, totalCost: 0, topItem: null, items: [] },
            deadlinesInfo: {
                upcoming: deadlinesData?.count || 0,
                nextDeadline: deadlinesData?.next ? {
                    title: deadlinesData.next.title,
                    dueDate: typeof deadlinesData.next.dueDate === 'string' ? deadlinesData.next.dueDate : deadlinesData.next.dueDate.toISOString()
                } : null,
                items: deadlinesData?.items || []
            }
        };

        await setCachedData(cacheKey, result, CACHE_TTL.DASHBOARD);
        return result;
    }
}

export const dashboardService = new DashboardService();
