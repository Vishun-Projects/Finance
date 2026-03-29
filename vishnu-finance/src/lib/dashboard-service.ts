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
        personName?: string | null;
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
    totalTransactionsCount: number;
    financialHealthScore: number;
    categoryStats: Record<string, { credits: number; debits: number }>;
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
    currentMonthStats: {
        income: number;
        expenses: number;
        netFlow: number;
    };
}

export class DashboardService {
    async getSimpleStats({ userId, startDate, endDate }: DashboardStatsParams): Promise<SimpleDashboardData> {
        const rangeStart = startDate;
        const rangeEnd = endDate;

        const cacheKey = `dashboard_stats:${userId}:${rangeStart.toISOString()}:${rangeEnd.toISOString()}`;
        const cached = await getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        // Define current month boundaries for the static stats
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const [
            transactionStats,
            activeGoalsCount,
            deadlinesData,
            recentTransactions,
            salaryInfo,
            plansInfo,
            wishlistInfo,
            netWorthStats,
            transactionTotalsData,
            categoryBreakdownRaw,
            currentMonthStatsResult
        ] = await Promise.all([
            // 1. Transaction Stats (FILTERED)
            (async () => {
                try {
                    return await (prisma as any).transaction.aggregate({
                        where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                        _sum: { creditAmount: true, debitAmount: true },
                        _count: true
                    });
                } catch { return { _sum: { creditAmount: 0, debitAmount: 0 }, _count: 0 }; }
            })(),
            // 2. Goals
            prisma.goal.count({ where: { userId, isActive: true } }).catch(() => 0),
            // 3. Deadlines
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
            // 4. Recent Transactions
            (async () => {
                try {
                    return await (prisma as any).transaction.findMany({
                        where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                        select: {
                            id: true, description: true, creditAmount: true, debitAmount: true,
                            financialCategory: true, transactionDate: true, store: true, personName: true,
                            category: { select: { name: true } }
                        },
                        orderBy: { transactionDate: 'desc' },
                        take: 10
                    });
                } catch { return []; }
            })(),
            // 5. Salary
            (async () => {
                try {
                    const salary = await (prisma as any).salaryStructure.findFirst({
                        where: { userId, isActive: true },
                        orderBy: [
                            { effectiveDate: 'desc' },
                            { createdAt: 'desc' }
                        ]
                    });
                    if (!salary) return null;
                    const allowances = typeof salary.allowances === 'string' ? JSON.parse(salary.allowances || '{}') : (salary.allowances || {});
                    const deductions = typeof salary.deductions === 'string' ? JSON.parse(salary.deductions || '{}') : (salary.deductions || {});
                    const totalAllowances = Object.values(allowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                    const totalDeductions = Object.values(deductions).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                    const netMonthly = (Number(salary.baseSalary) / 12) + totalAllowances - totalDeductions;
                    return { takeHome: netMonthly, ctc: Number(salary.baseSalary), jobTitle: salary.jobTitle, company: salary.company };
                } catch { return null; }
            })(),
            // 6. Plans
            (async () => {
                try {
                    const goals = await prisma.goal.findMany({
                        where: { userId, isActive: true },
                        select: { title: true, targetAmount: true, currentAmount: true, priority: true },
                        take: 20
                    });
                    return { activePlans: goals.length, totalCommitted: goals.reduce((s: number, p: any) => s + Number(p.targetAmount || 0), 0), topPlan: goals[0]?.title || null, items: goals.map(p => ({ name: p.title, targetAmount: Number(p.targetAmount), currentAmount: Number(p.currentAmount) })) };
                } catch { return { activePlans: 0, totalCommitted: 0, topPlan: null, items: [] }; }
            })(),
            // 7. Wishlist
            (async () => {
                try {
                    const items = await (prisma as any).wishlistItem.findMany({ where: { userId }, take: 20 });
                    return { totalItems: items.length, totalCost: items.reduce((s: number, i: any) => s + Number(i.estimatedCost || 0), 0), topItem: items[0]?.title || null, items: items.map((i: any) => ({ name: i.title, estimatedPrice: Number(i.estimatedCost) })) };
                } catch { return { totalItems: 0, totalCost: 0, topItem: null, items: [] }; }
            })(),
            // 8. Net Worth (ALL TIME)
            (async () => {
                try {
                    return await (prisma as any).transaction.aggregate({ where: { userId, isDeleted: false }, _sum: { creditAmount: true, debitAmount: true } });
                } catch { return { _sum: { creditAmount: 0, debitAmount: 0 } }; }
            })(),
            // 9. Transaction Totals for Monthly Trends (FILTERED)
            (async () => {
                try {
                    // Group by year and month to build trends
                    const data = await (prisma as any).transaction.findMany({
                        where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                        select: { transactionDate: true, creditAmount: true, debitAmount: true }
                    });
                    return data;
                } catch { return []; }
            })(),
            // 10. Category Breakdown (FILTERED) with Category Names
            (async () => {
                try {
                    const data = await (prisma as any).transaction.groupBy({
                        by: ['categoryId'],
                        where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd }, financialCategory: 'EXPENSE' },
                        _sum: { debitAmount: true }
                    });

                    // Fetch category names for these IDs
                    const categoryIds = data.map((item: any) => item.categoryId).filter(Boolean);
                    const categories = await (prisma as any).category.findMany({
                        where: { id: { in: categoryIds } },
                        select: { id: true, name: true }
                    });
                    const catMap = new Map(categories.map((c: any) => [c.id, c.name]));

                    return data.map((item: any) => ({
                        name: catMap.get(item.categoryId) || 'Uncategorized',
                        amount: Number(item._sum.debitAmount || 0)
                    }));
                } catch { return []; }
            })(),
            // 11. Current Month Stats (STRICT CALENDAR MONTH)
            (async () => {
                try {
                    const stats = await (prisma as any).transaction.aggregate({
                        where: { userId, isDeleted: false, transactionDate: { gte: monthStart, lte: monthEnd } },
                        _sum: { creditAmount: true, debitAmount: true }
                    });
                    const income = Number(stats._sum.creditAmount || 0);
                    const expenses = Number(stats._sum.debitAmount || 0);
                    return { income, expenses, netFlow: income - expenses };
                } catch { return { income: 0, expenses: 0, netFlow: 0 }; }
            })()
        ]);

        const totalIncome = Number(transactionStats._sum?.creditAmount || 0);
        const totalExpenses = Number(transactionStats._sum?.debitAmount || 0);
        const netSavings = totalIncome - totalExpenses;
        const totalNetWorth = Number(netWorthStats._sum?.creditAmount || 0) - Number(netWorthStats._sum?.debitAmount || 0);

        // Process Monthly Trends
        const trendsMap = new Map<string, { income: number; expenses: number; savings: number; credits: number; debits: number }>();
        (transactionTotalsData as any[]).forEach(t => {
            const d = new Date(t.transactionDate);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthName = d.toLocaleDateString('en-US', { month: 'short' });

            const existing = trendsMap.get(key) || { income: 0, expenses: 0, savings: 0, credits: 0, debits: 0, name: monthName };
            const credit = Number(t.creditAmount || 0);
            const debit = Number(t.debitAmount || 0);

            existing.income += credit;
            existing.expenses += debit;
            existing.credits += credit;
            existing.debits += debit;
            existing.savings = existing.income - existing.expenses;

            trendsMap.set(key, existing);
        });

        const monthlyTrends = Array.from(trendsMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([_, val]: [any, any]) => ({
                month: val.name,
                income: val.income,
                expenses: val.expenses,
                savings: val.savings,
                credits: val.credits,
                debits: val.debits
            }));

        const result: SimpleDashboardData = {
            totalIncome,
            totalExpenses,
            totalCredits: totalIncome,
            totalDebits: totalExpenses,
            netSavings,
            totalNetWorth,
            savingsRate: totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0,
            upcomingDeadlines: deadlinesData?.count || 0,
            activeGoals: activeGoalsCount,
            recentTransactions: (recentTransactions || []).map((t: any) => ({
                id: t.id,
                title: t.description || (Number(t.creditAmount || 0) > 0 ? 'Credit' : 'Debit'),
                amount: Number(t.creditAmount || 0) > 0 ? Number(t.creditAmount) : -Number(t.debitAmount),
                type: Number(t.creditAmount || 0) > 0 ? 'credit' : 'debit',
                date: t.transactionDate.toISOString().split('T')[0],
                category: t.category?.name || t.financialCategory || 'Other',
                financialCategory: t.financialCategory,
                store: t.store || null,
                personName: t.personName || null
            })),
            totalTransactionsCount: transactionStats._count || 0,
            monthlyTrends,
            categoryBreakdown: categoryBreakdownRaw as any[],
            financialHealthScore: 0,
            categoryStats: {},
            salaryInfo: salaryInfo || null,
            plansInfo: plansInfo || { activePlans: 0, totalCommitted: 0, topPlan: null, items: [] },
            wishlistInfo: wishlistInfo || { totalItems: 0, totalCost: 0, topItem: null, items: [] },
            deadlinesInfo: {
                upcoming: deadlinesData?.count || 0,
                nextDeadline: deadlinesData?.next ? { title: deadlinesData.next.title, dueDate: deadlinesData.next.dueDate.toISOString() } : null,
                items: deadlinesData?.items || []
            },
            currentMonthStats: currentMonthStatsResult
        };

        await setCachedData(cacheKey, result, CACHE_TTL.DASHBOARD);
        return result;
    }
}

export const dashboardService = new DashboardService();
