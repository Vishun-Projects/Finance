import { prisma } from './db';
import { getCachedData, setCachedData, CACHE_TTL } from './api-cache';
import type { SimpleDashboardData } from '@/types/dashboard';
import { computeIncomeBreakdown } from '@/lib/income-breakdown';
import { getTransactionDisplayName } from '@/lib/transaction-utils';
import {
  getEffectiveExpenseAmount,
  getEffectiveIncomeAmount,
  loadSettlementLookup,
} from '@/lib/transaction-settlement-service';

interface DashboardStatsParams {
    userId: string;
    startDate: Date;
    endDate: Date;
}

export type { SimpleDashboardData };

async function computeMonthFinancials(userId: string, monthStart: Date, monthEnd: Date) {
  const dateFilter = { gte: monthStart, lte: monthEnd };
  const [incomeAgg, expenseAgg, incomeTransactions, expenseTransactions, settlementLookup] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        isDeleted: false,
        financialCategory: 'INCOME',
        transactionDate: dateFilter,
      },
      _sum: { creditAmount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        isDeleted: false,
        financialCategory: 'EXPENSE',
        transactionDate: dateFilter,
      },
      _sum: { debitAmount: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        isDeleted: false,
        financialCategory: 'INCOME',
        transactionDate: dateFilter,
      },
      select: {
        id: true,
        creditAmount: true,
        description: true,
        personName: true,
        store: true,
        category: { select: { name: true } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        isDeleted: false,
        financialCategory: 'EXPENSE',
        transactionDate: dateFilter,
      },
      select: {
        id: true,
        debitAmount: true,
      },
    }),
    loadSettlementLookup(userId, monthStart, monthEnd),
  ]);

  const incomeBreakdown = computeIncomeBreakdown(
    incomeTransactions.map((tx) => ({
      creditAmount: Number(tx.creditAmount) || 0,
      categoryName: tx.category?.name ?? null,
      description: tx.description,
      personName: tx.personName,
      store: tx.store,
    })),
  );

  const income = Number(incomeAgg._sum.creditAmount || 0);
  const expenses = Number(expenseAgg._sum.debitAmount || 0);
  incomeBreakdown.total = income;

  const adjustedIncome = incomeTransactions.reduce(
    (sum, tx) =>
      sum + getEffectiveIncomeAmount(Number(tx.creditAmount) || 0, tx.id, settlementLookup),
    0,
  );

  const adjustedExpenses = expenseTransactions.reduce(
    (sum, tx) =>
      sum + getEffectiveExpenseAmount(Number(tx.debitAmount) || 0, tx.id, settlementLookup),
    0,
  );

  return {
    income,
    expenses,
    netFlow: income - expenses,
    adjustedIncome,
    adjustedExpenses,
    adjustedNetFlow: adjustedIncome - adjustedExpenses,
    incomeBreakdown,
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
            currentMonthStatsResult,
            topPayeesResult
        ] = await Promise.all([
            (async () => {
                try {
                    const [incomeAgg, expenseAgg, count] = await Promise.all([
                      prisma.transaction.aggregate({
                        where: {
                          userId,
                          isDeleted: false,
                          financialCategory: 'INCOME',
                          transactionDate: { gte: rangeStart, lte: rangeEnd },
                        },
                        _sum: { creditAmount: true },
                      }),
                      prisma.transaction.aggregate({
                        where: {
                          userId,
                          isDeleted: false,
                          financialCategory: 'EXPENSE',
                          transactionDate: { gte: rangeStart, lte: rangeEnd },
                        },
                        _sum: { debitAmount: true },
                      }),
                      prisma.transaction.count({
                        where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                      }),
                    ]);
                    return {
                      _sum: {
                        creditAmount: incomeAgg._sum.creditAmount,
                        debitAmount: expenseAgg._sum.debitAmount,
                      },
                      _count: count,
                    };
                } catch { return { _sum: { creditAmount: 0, debitAmount: 0 }, _count: 0 }; }
            })(),
            prisma.goal.count({ where: { userId, isActive: true } }).catch(() => 0),
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
            (async () => {
                try {
                    const items = await (prisma as any).wishlistItem.findMany({ where: { userId }, take: 20 });
                    return { totalItems: items.length, totalCost: items.reduce((s: number, i: any) => s + Number(i.estimatedCost || 0), 0), topItem: items[0]?.title || null, items: items.map((i: any) => ({ name: i.title, estimatedPrice: Number(i.estimatedCost) })) };
                } catch { return { totalItems: 0, totalCost: 0, topItem: null, items: [] }; }
            })(),
            (async () => {
                try {
                    return await (prisma as any).transaction.aggregate({ where: { userId, isDeleted: false }, _sum: { creditAmount: true, debitAmount: true } });
                } catch { return { _sum: { creditAmount: 0, debitAmount: 0 } }; }
            })(),
            (async () => {
                try {
                    const data = await (prisma as any).transaction.findMany({
                        where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                        select: {
                          transactionDate: true,
                          creditAmount: true,
                          debitAmount: true,
                          financialCategory: true,
                        }
                    });
                    return data;
                } catch { return []; }
            })(),
            (async () => {
                try {
                    const data = await (prisma as any).transaction.groupBy({
                        by: ['categoryId'],
                        where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd }, financialCategory: 'EXPENSE' },
                        _sum: { debitAmount: true }
                    });

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
            computeMonthFinancials(userId, rangeStart, rangeEnd).catch(() => ({
              income: 0,
              expenses: 0,
              netFlow: 0,
              adjustedIncome: 0,
              adjustedExpenses: 0,
              adjustedNetFlow: 0,
              incomeBreakdown: { salary: 0, family: 0, other: 0, total: 0 },
            })),
            (async () => {
                try {
                    const transactions = await (prisma as any).transaction.findMany({
                        where: { userId, isDeleted: false, financialCategory: 'EXPENSE', transactionDate: { gte: rangeStart, lte: rangeEnd } },
                        select: { store: true, personName: true, debitAmount: true }
                    });
                    
                    const payeeMap = new Map<string, { amount: number; count: number }>();
                    transactions.forEach((t: any) => {
                        const name = t.store || t.personName || 'Various';
                        if (name === 'Various' && !t.store && !t.personName) return;
                        const existing = payeeMap.get(name) || { amount: 0, count: 0 };
                        existing.amount += Number(t.debitAmount || 0);
                        existing.count += 1;
                        payeeMap.set(name, existing);
                    });

                    return Array.from(payeeMap.entries())
                        .map(([name, stats]) => ({ name, ...stats }))
                        .sort((a, b) => b.amount - a.amount)
                        .slice(0, 5);
                } catch { return []; }
            })()
        ]);

        const totalIncome = Number(transactionStats._sum?.creditAmount || 0);
        const totalExpenses = Number(transactionStats._sum?.debitAmount || 0);
        const netSavings = totalIncome - totalExpenses;
        const totalNetWorth = Number(netWorthStats._sum?.creditAmount || 0) - Number(netWorthStats._sum?.debitAmount || 0);

        const dynamicInsights: Array<{ type: 'pattern' | 'warning' | 'positive'; message: string }> = [];
        const topPayees = topPayeesResult as any[];
        
        categoryBreakdownRaw.slice(0, 3).forEach((cat: any) => {
            if (cat.amount > totalExpenses * 0.3 && totalExpenses > 0) {
                dynamicInsights.push({ 
                    type: 'warning', 
                    message: `SYSTEM_ALERT: [${cat.name}] sector consumes ${Math.round((cat.amount/totalExpenses)*100)}% of tactical outflow. Audit recommended.` 
                });
            }
        });

        const topPayee = topPayees[0];
        if (topPayee && topPayee.amount > totalExpenses * 0.15 && totalExpenses > 0) {
            dynamicInsights.push({
                type: 'pattern',
                message: `FLOW_PATTERN: High-frequency capital redirection to [${topPayee.name}] detected (${topPayee.count} events).`
            });
        }

        const monthIncome = currentMonthStatsResult.income;
        const monthExpenses = currentMonthStatsResult.expenses;
        const monthNet = currentMonthStatsResult.netFlow;

        if (monthNet > 0) {
            dynamicInsights.push({
                type: 'positive',
                message: `CAPITAL_YEILD: Positive net flow maintained. Reserve runway extended by ${Math.floor(monthNet / (monthExpenses / 30 || 1))} days.`
            });
        } else if (monthExpenses > monthIncome && monthIncome > 0) {
            dynamicInsights.push({
                type: 'warning',
                message: `SYSTEM_CRITICAL: Outflow exceeds inbound liquidity by ${Math.round((monthExpenses / monthIncome - 1) * 100)}%. Immediate burn reduction required.`
            });
        }

        if (dynamicInsights.length === 0) {
            dynamicInsights.push({ type: 'pattern', message: 'FAS_MONITORING: Nominal flow patterns detected. Continuously auditing transaction metadata.' });
        }

        const trendsMap = new Map<string, { income: number; expenses: number; savings: number; credits: number; debits: number }>();
        (transactionTotalsData as any[]).forEach(t => {
            const d = new Date(t.transactionDate);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            const existing = trendsMap.get(key) || { income: 0, expenses: 0, savings: 0, credits: 0, debits: 0, name: d.toLocaleDateString('en-US', { month: 'short' }) };
            const credit = t.financialCategory === 'INCOME' ? Number(t.creditAmount || 0) : 0;
            const debit = t.financialCategory === 'EXPENSE' ? Number(t.debitAmount || 0) : 0;

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
                title: getTransactionDisplayName({
                    description: t.description,
                    store: t.store,
                    personName: t.personName,
                }),
                amount: Number(t.creditAmount || 0) > 0 ? Number(t.creditAmount) : -Number(t.debitAmount),
                type: Number(t.creditAmount || 0) > 0 ? 'credit' : 'debit',
                date: t.transactionDate.toISOString().split('T')[0],
                category: t.category?.name || t.financialCategory || 'Other',
                financialCategory: t.financialCategory,
                store: t.store || null,
                personName: t.personName || null,
                description: t.description || null,
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
            currentMonthStats: {
              income: currentMonthStatsResult.income,
              expenses: currentMonthStatsResult.expenses,
              netFlow: currentMonthStatsResult.netFlow,
              adjustedIncome: currentMonthStatsResult.adjustedIncome,
              adjustedExpenses: currentMonthStatsResult.adjustedExpenses,
              adjustedNetFlow: currentMonthStatsResult.adjustedNetFlow,
            },
            incomeBreakdown: currentMonthStatsResult.incomeBreakdown,
            topPayees: topPayees || [],
            dynamicInsights: dynamicInsights.slice(0, 2)
        };

        await setCachedData(cacheKey, result, CACHE_TTL.DASHBOARD);
        return result;
    }
}

export const dashboardService = new DashboardService();
