import { cache } from 'react';
import { prisma } from './db';
import { getCachedData, setCachedData, CACHE_TTL } from './api-cache';
import type { SimpleDashboardData } from '@/types/dashboard';
import { computeIncomeBreakdown } from '@/lib/income-breakdown';
import { getTransactionDisplayName } from '@/lib/transaction-utils';
import { buildDynamicInsights } from '@/lib/dashboard-insights';
import {
  getEffectiveExpenseAmount,
  getEffectiveIncomeAmount,
  loadSettlementLookup,
} from '@/lib/transaction-settlement-service';

interface DashboardStatsParams {
    userId: string;
    startDate: Date;
    endDate: Date;
    preloaded?: {
        goals?: Array<{ title: string; targetAmount: unknown; currentAmount: unknown; priority?: string | null; isActive?: boolean }>;
        deadlines?: { count?: number; items?: Array<{ title: string; dueDate: string; amount: number }> };
        wishlist?: { data?: Array<{ title: string; estimatedCost?: unknown }> };
    };
}

export type { SimpleDashboardData };

type MonthFinancials = {
  income: number;
  expenses: number;
  netFlow: number;
  adjustedIncome: number;
  adjustedExpenses: number;
  adjustedNetFlow: number;
  incomeBreakdown: { salary: number; family: number; other: number; total: number };
  transactionCount: number;
};

/** Single month scan shared within a request (dedupes stats vs duplicate aggregates). */
export const loadMonthFinancialsCached = cache(
  async (userId: string, monthStartIso: string, monthEndIso: string): Promise<MonthFinancials> => {
    const monthStart = new Date(monthStartIso);
    const monthEnd = new Date(monthEndIso);
    const dateFilter = { gte: monthStart, lte: monthEnd };

    const [incomeTransactions, expenseTransactions, settlementLookup] = await Promise.all([
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

    const income = incomeTransactions.reduce((sum, tx) => sum + (Number(tx.creditAmount) || 0), 0);
    const expenses = expenseTransactions.reduce((sum, tx) => sum + (Number(tx.debitAmount) || 0), 0);
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
      transactionCount: incomeTransactions.length + expenseTransactions.length,
    };
  },
);

export class DashboardService {
    async getSimpleStats({ userId, startDate, endDate, preloaded }: DashboardStatsParams): Promise<SimpleDashboardData> {
        const rangeStart = startDate;
        const rangeEnd = endDate;

        const cacheKey = `dashboard_stats_v2:${userId}:${rangeStart.toISOString()}:${rangeEnd.toISOString()}`;
        const cached = await getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        const goalsFromPreload = preloaded?.goals;
        const deadlinesFromPreload = preloaded?.deadlines;
        const wishlistFromPreload = preloaded?.wishlist;

        const monthIsoStart = rangeStart.toISOString();
        const monthIsoEnd = rangeEnd.toISOString();

        const [
            currentMonthStatsResult,
            activeGoalsCount,
            deadlinesData,
            recentTransactions,
            salaryInfo,
            plansInfo,
            wishlistInfo,
            categoryBreakdownRaw,
        ] = await Promise.all([
            loadMonthFinancialsCached(userId, monthIsoStart, monthIsoEnd).catch(() => ({
              income: 0,
              expenses: 0,
              netFlow: 0,
              adjustedIncome: 0,
              adjustedExpenses: 0,
              adjustedNetFlow: 0,
              incomeBreakdown: { salary: 0, family: 0, other: 0, total: 0 },
              transactionCount: 0,
            })),
            goalsFromPreload
              ? Promise.resolve(goalsFromPreload.filter((g) => g.isActive !== false).length)
              : prisma.goal.count({ where: { userId, isActive: true } }).catch(() => 0),
            deadlinesFromPreload?.items
              ? Promise.resolve({
                  count: deadlinesFromPreload.count ?? deadlinesFromPreload.items.length,
                  next: deadlinesFromPreload.items[0]
                    ? {
                        title: deadlinesFromPreload.items[0].title,
                        dueDate: new Date(deadlinesFromPreload.items[0].dueDate),
                        amount: deadlinesFromPreload.items[0].amount,
                      }
                    : null,
                  items: deadlinesFromPreload.items,
                })
              : (async () => {
                try {
                    const deadlines = await prisma.deadline.findMany({
                        where: { userId, isCompleted: false },
                        orderBy: { dueDate: 'asc' },
                        select: { title: true, dueDate: true, amount: true },
                        take: 20
                    });
                    return {
                        count: deadlines.length,
                        next: deadlines[0] || null,
                        items: deadlines.map((d: { title: string; dueDate: Date; amount: unknown }) => ({
                            title: d.title,
                            dueDate: d.dueDate.toISOString(),
                            amount: Number(d.amount) || 0,
                        }))
                    };
                } catch { return { count: 0, next: null, items: [] }; }
            })(),
            prisma.transaction.findMany({
                where: { userId, isDeleted: false, transactionDate: { gte: rangeStart, lte: rangeEnd } },
                select: {
                    id: true, description: true, creditAmount: true, debitAmount: true,
                    financialCategory: true, transactionDate: true, store: true, personName: true,
                    category: { select: { name: true } }
                },
                orderBy: { transactionDate: 'desc' },
                take: 10
            }).catch(() => []),
            (async () => {
                try {
                    const salary = await prisma.salaryStructure.findFirst({
                        where: { userId, isActive: true },
                        orderBy: [
                            { effectiveDate: 'desc' },
                            { createdAt: 'desc' }
                        ]
                    });
                    if (!salary) return null;
                    const allowances = typeof salary.allowances === 'string' ? JSON.parse(salary.allowances || '{}') : (salary.allowances || {});
                    const deductions = typeof salary.deductions === 'string' ? JSON.parse(salary.deductions || '{}') : (salary.deductions || {});
                    const totalAllowances = Object.values(allowances).reduce((sum: number, val: unknown) => sum + (Number(val) || 0), 0);
                    const totalDeductions = Object.values(deductions).reduce((sum: number, val: unknown) => sum + (Number(val) || 0), 0);
                    const netMonthly = (Number(salary.baseSalary) / 12) + totalAllowances - totalDeductions;
                    return { takeHome: netMonthly, ctc: Number(salary.baseSalary), jobTitle: salary.jobTitle, company: salary.company };
                } catch { return null; }
            })(),
            goalsFromPreload
              ? Promise.resolve((() => {
                  const activeGoals = goalsFromPreload.filter((g) => g.isActive !== false);
                  return {
                    activePlans: activeGoals.length,
                    totalCommitted: activeGoals.reduce((s, p) => s + Number(p.targetAmount || 0), 0),
                    topPlan: activeGoals[0]?.title || null,
                    items: activeGoals.map((p) => ({
                      name: p.title,
                      targetAmount: Number(p.targetAmount),
                      currentAmount: Number(p.currentAmount),
                    })),
                  };
                })())
              : (async () => {
                try {
                    const goals = await prisma.goal.findMany({
                        where: { userId, isActive: true },
                        select: { title: true, targetAmount: true, currentAmount: true, priority: true },
                        take: 20
                    });
                    return {
                      activePlans: goals.length,
                      totalCommitted: goals.reduce((s, p) => s + Number(p.targetAmount || 0), 0),
                      topPlan: goals[0]?.title || null,
                      items: goals.map((p) => ({
                        name: p.title,
                        targetAmount: Number(p.targetAmount),
                        currentAmount: Number(p.currentAmount),
                      })),
                    };
                } catch { return { activePlans: 0, totalCommitted: 0, topPlan: null, items: [] }; }
            })(),
            wishlistFromPreload?.data
              ? Promise.resolve({
                  totalItems: wishlistFromPreload.data.length,
                  totalCost: wishlistFromPreload.data.reduce((s, i) => s + Number(i.estimatedCost || 0), 0),
                  topItem: wishlistFromPreload.data[0]?.title || null,
                  items: wishlistFromPreload.data.map((i) => ({
                    name: i.title,
                    estimatedPrice: Number(i.estimatedCost),
                  })),
                })
              : (async () => {
                try {
                    const items = await prisma.wishlistItem.findMany({ where: { userId }, take: 20 });
                    return {
                      totalItems: items.length,
                      totalCost: items.reduce((s, i) => s + Number(i.estimatedCost || 0), 0),
                      topItem: items[0]?.title || null,
                      items: items.map((i) => ({ name: i.title, estimatedPrice: Number(i.estimatedCost) })),
                    };
                } catch { return { totalItems: 0, totalCost: 0, topItem: null, items: [] }; }
            })(),
            (async () => {
                try {
                    const data = await prisma.transaction.groupBy({
                        by: ['categoryId'],
                        where: {
                          userId,
                          isDeleted: false,
                          transactionDate: { gte: rangeStart, lte: rangeEnd },
                          financialCategory: 'EXPENSE',
                        },
                        _sum: { debitAmount: true }
                    });

                    const categoryIds = data.map((item) => item.categoryId).filter(Boolean) as string[];
                    if (categoryIds.length === 0) return [];

                    const categories = await prisma.category.findMany({
                        where: { id: { in: categoryIds } },
                        select: { id: true, name: true }
                    });
                    const catMap = new Map(categories.map((c) => [c.id, c.name]));

                    return data.map((item) => ({
                        name: (item.categoryId && catMap.get(item.categoryId)) || 'Uncategorized',
                        amount: Number(item._sum.debitAmount || 0)
                    }));
                } catch { return []; }
            })(),
        ]);

        const totalIncome = currentMonthStatsResult.income;
        const totalExpenses = currentMonthStatsResult.expenses;
        const netSavings = totalIncome - totalExpenses;
        // Avoid all-time full-table aggregate on first paint; month net is enough for overview.
        const totalNetWorth = currentMonthStatsResult.adjustedNetFlow;

        const monthName = rangeStart.toLocaleDateString('en-US', { month: 'short' });
        const monthlyTrends = [
          {
            month: monthName,
            income: totalIncome,
            expenses: totalExpenses,
            savings: netSavings,
            credits: totalIncome,
            debits: totalExpenses,
          },
        ];

        const topPayees: SimpleDashboardData['topPayees'] = [];

        const dynamicInsights = buildDynamicInsights({
            categoryBreakdown: categoryBreakdownRaw as SimpleDashboardData['categoryBreakdown'],
            topPayees,
            totalExpenses,
            monthIncome: currentMonthStatsResult.income,
            monthExpenses: currentMonthStatsResult.expenses,
            monthNet: currentMonthStatsResult.netFlow,
        });

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
            recentTransactions: (recentTransactions || []).map((t) => ({
                id: t.id,
                title: getTransactionDisplayName({
                    description: t.description,
                    store: t.store,
                    personName: t.personName,
                }),
                amount: (() => {
                  const credit = Number(t.creditAmount) || 0;
                  const debit = Number(t.debitAmount) || 0;
                  return credit > 0 ? credit : -debit;
                })(),
                type: Number(t.creditAmount || 0) > 0 ? 'credit' : 'debit',
                date: t.transactionDate.toISOString().split('T')[0],
                category: t.category?.name || t.financialCategory || 'Other',
                financialCategory: t.financialCategory,
                store: t.store || null,
                personName: t.personName || null,
                description: t.description || null,
            })),
            totalTransactionsCount: currentMonthStatsResult.transactionCount || 0,
            monthlyTrends,
            categoryBreakdown: categoryBreakdownRaw as SimpleDashboardData['categoryBreakdown'],
            financialHealthScore: 0,
            categoryStats: {},
            salaryInfo: salaryInfo || null,
            plansInfo: plansInfo || { activePlans: 0, totalCommitted: 0, topPlan: null, items: [] },
            wishlistInfo: wishlistInfo || { totalItems: 0, totalCost: 0, topItem: null, items: [] },
            deadlinesInfo: {
                upcoming: deadlinesData?.count || 0,
                nextDeadline: deadlinesData?.next
                    ? {
                        title: deadlinesData.next.title,
                        dueDate: deadlinesData.next.dueDate.toISOString(),
                        amount: Number(deadlinesData.next.amount) || 0,
                      }
                    : null,
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
            topPayees,
            dynamicInsights: dynamicInsights.slice(0, 2)
        };

        await setCachedData(cacheKey, result, CACHE_TTL.DASHBOARD);
        return result;
    }
}

export const dashboardService = new DashboardService();
