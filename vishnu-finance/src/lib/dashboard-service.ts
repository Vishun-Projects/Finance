import { prisma } from './db';

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
}

export class DashboardService {
    async getSimpleStats({ userId, startDate, endDate }: DashboardStatsParams): Promise<SimpleDashboardData> {
        const rangeStart = startDate;
        const rangeEnd = endDate;

        // Direct Database Aggregations
        const [transactionStats, legacyExpenseStats, legacyIncomeStats, activeGoalsCount, upcomingDeadlinesCount, recentTransactions] = await Promise.all([
            // 1. Transaction Stats
            (async () => {
                try {
                    await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
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

            // 2. Legacy Expenses
            (prisma as any).expense.aggregate({
                where: { userId, date: { gte: rangeStart, lte: rangeEnd } },
                _sum: { amount: true }, _count: true
            }).catch(() => ({ _sum: { amount: 0 }, _count: 0 })),

            // 3. Legacy Income
            (prisma as any).incomeSource.findMany({
                where: { userId, isActive: true },
                select: { id: true, name: true, amount: true, frequency: true, startDate: true, category: { select: { name: true } } },
                orderBy: { startDate: 'desc' }
            }).catch(() => []),

            // 4. Goals
            prisma.goal.count({ where: { userId, isActive: true } }).catch(() => 0),

            // 5. Deadlines
            prisma.deadline.count({ where: { userId, isCompleted: false, dueDate: { gt: new Date() } } }).catch(() => 0),

            // 6. Recent Transactions
            (async () => {
                try {
                    await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
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
            })()
        ]);

        // Totals Calculation
        const totalCredits = Number(transactionStats._sum?.creditAmount || 0);
        const totalDebits = Number(transactionStats._sum?.debitAmount || 0);
        const legacyExpenses = Number(legacyExpenseStats._sum?.amount || 0);

        // Legacy Income Calculation
        const rangeStartTime = rangeStart.getTime();
        const rangeEndTime = rangeEnd.getTime();
        const daysInRange = Math.ceil((rangeEndTime - rangeStartTime) / (1000 * 60 * 60 * 24)) + 1;

        const legacyIncome = legacyIncomeStats.reduce((sum: number, source: { startDate: string | Date, amount: number | string, frequency: string }) => {
            const sourceDate = new Date(source.startDate);
            const sourceTime = sourceDate.getTime();
            if (sourceTime > rangeEndTime) return sum;
            const amount = Number(source.amount);
            if (source.frequency === 'ONE_TIME') return (sourceTime >= rangeStartTime && sourceTime <= rangeEndTime) ? sum + amount : sum;

            const effectiveStart = Math.max(rangeStartTime, sourceTime);
            const effectiveDays = Math.max(0, Math.ceil((rangeEndTime - effectiveStart) / (1000 * 60 * 60 * 24)) + 1);

            switch (source.frequency) {
                case 'MONTHLY': return sum + (amount * (effectiveDays / 30));
                case 'YEARLY': return sum + ((amount / 365) * effectiveDays);
                case 'WEEKLY': return sum + (amount * (effectiveDays / 7));
                case 'DAILY': return sum + (amount * effectiveDays);
                default: return sum;
            }
        }, 0);

        const totalIncome = totalCredits + legacyIncome;
        const totalExpenses = totalDebits + legacyExpenses;
        const netSavings = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

        // Total Net Worth (All Time)
        const netWorthStats = await (async () => {
            try {
                await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
                return await (prisma as any).transaction.aggregate({
                    where: { userId, isDeleted: false },
                    _sum: { creditAmount: true, debitAmount: true }
                });
            } catch { return { _sum: { creditAmount: 0, debitAmount: 0 } }; }
        })();
        const totalNetWorth = (Number(netWorthStats._sum?.creditAmount || 0) + legacyIncome) - (Number(netWorthStats._sum?.debitAmount || 0) + legacyExpenses);

        // Category Stats
        const categoryStats = await (async () => {
            try {
                await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
                return await (prisma as any).transaction.groupBy({
                    by: ['financialCategory'],
                    where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                    _sum: { creditAmount: true, debitAmount: true }
                });
            } catch { return []; }
        })();
        const financialCategoryStatsMap = new Map();
        categoryStats.forEach((stat: any) => {
            financialCategoryStatsMap.set(stat.financialCategory, {
                credits: Number(stat._sum.creditAmount || 0),
                debits: Number(stat._sum.debitAmount || 0),
            });
        });

        const transactionTotals = await (async () => {
            try {
                await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
                return await (prisma as any).transaction.groupBy({
                    by: ['transactionDate'],
                    where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                    _sum: { creditAmount: true, debitAmount: true }
                });
            } catch { return []; }
        })();

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
        const categoryBreakdownData = await (async () => {
            try {
                await (prisma as any).$queryRaw`SELECT 1 FROM transactions LIMIT 1`;
                return await (prisma as any).transaction.groupBy({
                    by: ['categoryId'],
                    where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                    _sum: { debitAmount: true, creditAmount: true }
                });
            } catch { return []; }
        })();

        // Process categories... (Simplified)
        const categoryBreakdown: SimpleDashboardData['categoryBreakdown'] = [];

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

        // Legacy Income Trans logic
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
                type: 'income',
                date: income.startDate.toISOString().split('T')[0],
                category: 'Income'
            }));

        const allTransactions = [...incomeTransactions, ...recentTrans]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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

        return {
            totalIncome,
            totalExpenses,
            totalCredits,
            totalDebits,
            netSavings,
            totalNetWorth,
            savingsRate: Math.round(savingsRate * 100) / 100,
            upcomingDeadlines: upcomingDeadlinesCount,
            activeGoals: activeGoalsCount,
            recentTransactions: allTransactions,
            monthlyTrends,
            categoryBreakdown,
            financialHealthScore: Math.min(financialHealthScore, 100),
            categoryStats: Object.fromEntries(financialCategoryStatsMap),
        };
    }
}

export const dashboardService = new DashboardService();
