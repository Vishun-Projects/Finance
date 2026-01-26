import { prisma } from './db';

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

export interface TransactionDetail {
  id: string;
  date: Date;
  description?: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER';
  category?: { name: string; icon?: string; color?: string } | null;
  store?: string;
  personName?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  topExpenseCategories: Array<{ category: string; amount: number; percentage: number }>;
  incomeTrends: Array<{ month: string; amount: number }>;
  expenseTrends: Array<{ month: string; amount: number }>;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  debtAmount: number;
  goalsProgress: Array<{ title: string; progress: number }>;
  categories: Array<{ name: string; type: string; transactionCount: number; totalAmount: number }>;
  wishlistItems: Array<{ title: string; estimatedCost: number; priority: string; isCompleted: boolean }>;
  allGoals: Array<{ title: string; targetAmount: number; currentAmount: number; progress: number; isActive: boolean; targetDate?: Date }>;
  allDeadlines: Array<{ title: string; amount: number; dueDate: Date; status: string; isCompleted: boolean }>;
  transactions: TransactionDetail[];
  totalTransactionCount: number;
  dateRange?: DateRange;
}

/**
 * Analyze user's financial data and generate summary for AI context
 */
export async function analyzeUserFinances(userId: string, dateRange?: DateRange): Promise<FinancialSummary> {
  try {
    // Build date filter - use provided date range or default to all transactions
    const dateFilter: any = { isDeleted: false };
    if (dateRange?.startDate || dateRange?.endDate) {
      dateFilter.transactionDate = {};
      if (dateRange.startDate) {
        dateFilter.transactionDate.gte = dateRange.startDate;
      }
      if (dateRange.endDate) {
        dateFilter.transactionDate.lte = dateRange.endDate;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        ...dateFilter,
      },
      include: {
        category: true,
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    // Calculate totals
    const totalIncome = transactions
      .filter((t) => t.financialCategory === 'INCOME')
      .reduce((sum, t) => sum + Number(t.creditAmount), 0);

    const totalExpenses = transactions
      .filter((t) => t.financialCategory === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.debitAmount), 0);

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Top expense categories
    const categoryTotals = new Map<string, number>();
    transactions
      .filter((t) => t.financialCategory === 'EXPENSE' && t.category)
      .forEach((t) => {
        const catName = t.category?.name || 'Uncategorized';
        const current = categoryTotals.get(catName) || 0;
        categoryTotals.set(catName, current + Number(t.debitAmount));
      });

    const topExpenseCategories = Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Monthly trends
    const monthlyData = new Map<string, { income: number; expenses: number }>();
    transactions.forEach((t) => {
      const monthKey = t.transactionDate.toISOString().substring(0, 7); // YYYY-MM
      const current = monthlyData.get(monthKey) || { income: 0, expenses: 0 };

      if (t.financialCategory === 'INCOME') {
        current.income += Number(t.creditAmount);
      } else if (t.financialCategory === 'EXPENSE') {
        current.expenses += Number(t.debitAmount);
      }

      monthlyData.set(monthKey, current);
    });

    const incomeTrends = Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month, amount: data.income }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const expenseTrends = Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month, amount: data.expenses }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const monthsCount = monthlyData.size || 1;
    const averageMonthlyIncome = totalIncome / monthsCount;
    const averageMonthlyExpenses = totalExpenses / monthsCount;

    // Get all deadlines (not just pending/overdue)
    const allDeadlines = await prisma.deadline.findMany({
      where: {
        userId,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    const debtAmount = allDeadlines
      .filter((d) => !d.isCompleted && ['PENDING', 'OVERDUE'].includes(d.status))
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);

    // Get all goals (active and inactive)
    const allGoals = await prisma.goal.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const goalsProgress = allGoals
      .filter((g) => g.isActive)
      .map((g) => ({
        title: g.title,
        progress: Number(g.targetAmount) > 0 ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0,
      }));

    // Get all categories with transaction counts and totals
    const categories = await prisma.category.findMany({
      where: {
        userId,
      },
      include: {
        transactions: {
          where: {
            userId,
            isDeleted: false,
            ...(dateRange?.startDate || dateRange?.endDate
              ? {
                transactionDate: {
                  ...(dateRange.startDate ? { gte: dateRange.startDate } : {}),
                  ...(dateRange.endDate ? { lte: dateRange.endDate } : {}),
                },
              }
              : {}),
          },
        },
      },
    });

    const categoriesWithStats = categories.map((cat) => {
      const categoryTransactions = cat.transactions || [];
      const totalAmount = categoryTransactions.reduce((sum, t) => {
        if (t.financialCategory === 'INCOME') {
          return sum + Number(t.creditAmount);
        } else if (t.financialCategory === 'EXPENSE') {
          return sum + Number(t.debitAmount);
        }
        return sum;
      }, 0);

      return {
        name: cat.name,
        type: cat.type,
        transactionCount: categoryTransactions.length,
        totalAmount,
      };
    });

    // Get all wishlist items
    const wishlistItems = await prisma.wishlistItem.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert transactions to detail format
    const transactionDetails: TransactionDetail[] = transactions.map((t) => {
      const amount = t.financialCategory === 'INCOME'
        ? Number(t.creditAmount)
        : Number(t.debitAmount);

      return {
        id: t.id,
        date: t.transactionDate,
        description: t.description || undefined,
        amount,
        type: t.financialCategory,
        category: t.category ? {
          name: t.category.name,
          icon: t.category.icon || undefined, // Handle potential nulls
          color: t.category.color || undefined
        } : null,
        store: t.store || undefined,
        personName: t.personName || undefined,
      };
    });

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      topExpenseCategories,
      incomeTrends,
      expenseTrends,
      averageMonthlyIncome,
      averageMonthlyExpenses,
      debtAmount,
      goalsProgress,
      categories: categoriesWithStats,
      wishlistItems: wishlistItems.map((item) => ({
        title: item.title,
        estimatedCost: Number(item.estimatedCost),
        priority: item.priority,
        isCompleted: item.isCompleted,
      })),
      allGoals: allGoals.map((g) => ({
        title: g.title,
        targetAmount: Number(g.targetAmount),
        currentAmount: Number(g.currentAmount),
        progress: Number(g.targetAmount) > 0 ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0,
        isActive: g.isActive,
        targetDate: g.targetDate || undefined,
      })),
      allDeadlines: allDeadlines.map((d) => ({
        title: d.title,
        amount: Number(d.amount || 0),
        dueDate: d.dueDate,
        status: d.status,
        isCompleted: d.isCompleted,
      })),
      transactions: transactionDetails,
      totalTransactionCount: transactions.length,
      dateRange,
    };
  } catch (error) {
    console.error('Error analyzing user finances:', error);
    // Return empty/default summary if analysis fails
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netSavings: 0,
      savingsRate: 0,
      topExpenseCategories: [],
      incomeTrends: [],
      expenseTrends: [],
      averageMonthlyIncome: 0,
      averageMonthlyExpenses: 0,
      debtAmount: 0,
      goalsProgress: [],
      categories: [],
      wishlistItems: [],
      allGoals: [],
      allDeadlines: [],
      transactions: [],
      totalTransactionCount: 0,
      dateRange,
    };
  }
}

/**
 * Format financial summary as text for AI context
 */
export function formatFinancialSummary(summary: FinancialSummary): string {
  let text = 'User Financial Summary:\n\n';

  // Add date range information if specified
  if (summary.dateRange?.startDate || summary.dateRange?.endDate) {
    const startStr = summary.dateRange.startDate
      ? summary.dateRange.startDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'beginning';
    const endStr = summary.dateRange.endDate
      ? summary.dateRange.endDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'today';
    text += `Data Period: ${startStr} to ${endStr}\n\n`;
  } else {
    text += `Data Period: All available data\n\n`;
  }

  text += `Income & Expenses:\n`;
  text += `- Total Income: ₹${summary.totalIncome.toLocaleString('en-IN')}\n`;
  text += `- Total Expenses: ₹${summary.totalExpenses.toLocaleString('en-IN')}\n`;
  text += `- Net Savings: ₹${summary.netSavings.toLocaleString('en-IN')}\n`;
  text += `- Savings Rate: ${summary.savingsRate.toFixed(1)}%\n`;
  text += `- Average Monthly Income: ₹${summary.averageMonthlyIncome.toLocaleString('en-IN')}\n`;
  text += `- Average Monthly Expenses: ₹${summary.averageMonthlyExpenses.toLocaleString('en-IN')}\n\n`;

  if (summary.debtAmount > 0) {
    text += `Outstanding Debt: ₹${summary.debtAmount.toLocaleString('en-IN')}\n\n`;
  }

  // All categories with usage
  if (summary.categories.length > 0) {
    text += `Categories:\n`;
    summary.categories.forEach((cat) => {
      text += `- ${cat.name} (${cat.type}): ${cat.transactionCount} transactions, ₹${cat.totalAmount.toLocaleString('en-IN')}\n`;
    });
    text += '\n';
  }

  if (summary.topExpenseCategories.length > 0) {
    text += `Top Expense Categories:\n`;
    summary.topExpenseCategories.forEach((cat) => {
      text += `- ${cat.category}: ₹${cat.amount.toLocaleString('en-IN')} (${cat.percentage.toFixed(1)}%)\n`;
    });
    text += '\n';
  }

  // All goals (active and inactive)
  if (summary.allGoals.length > 0) {
    text += `Financial Goals:\n`;
    summary.allGoals.forEach((goal) => {
      const status = goal.isActive ? 'Active' : 'Inactive';
      const targetDateStr = goal.targetDate
        ? goal.targetDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'No target date';
      text += `- ${goal.title} (${status}): ₹${goal.currentAmount.toLocaleString('en-IN')} / ₹${goal.targetAmount.toLocaleString('en-IN')} (${goal.progress.toFixed(1)}% complete), Target: ${targetDateStr}\n`;
    });
    text += '\n';
  }

  // Wishlist items
  if (summary.wishlistItems.length > 0) {
    text += `Wishlist Items:\n`;
    summary.wishlistItems.forEach((item) => {
      const status = item.isCompleted ? 'Completed' : 'Pending';
      text += `- ${item.title} (${item.priority} priority, ${status}): ₹${item.estimatedCost.toLocaleString('en-IN')}\n`;
    });
    text += '\n';
  }

  // All deadlines
  if (summary.allDeadlines.length > 0) {
    text += `Deadlines & Bills:\n`;
    summary.allDeadlines.forEach((deadline) => {
      const dueDateStr = deadline.dueDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      const status = deadline.isCompleted ? 'Completed' : deadline.status;
      text += `- ${deadline.title}: ₹${deadline.amount.toLocaleString('en-IN')}, Due: ${dueDateStr}, Status: ${status}\n`;
    });
    text += '\n';
  }

  // Transaction details
  if (summary.transactions.length > 0) {
    // If a specific date range is requested, show ALL transactions (not limited)
    // Otherwise, limit to prevent token overflow for very large datasets
    const MAX_TRANSACTIONS_TO_SHOW = summary.dateRange ? summary.transactions.length : 1000;

    // If date range is specified, show transactions chronologically (by date)
    // Otherwise, sort by amount (descending) for overview
    let transactionsToShow = [...summary.transactions];
    if (summary.dateRange) {
      // For specific date ranges, show chronologically (already sorted by date from DB)
      // No need to re-sort or limit
    } else {
      // For general queries, sort by amount descending and limit
      transactionsToShow = transactionsToShow
        .sort((a, b) => b.amount - a.amount)
        .slice(0, MAX_TRANSACTIONS_TO_SHOW);
    }

    text += `Transaction Details (${summary.totalTransactionCount} total transactions`;
    if (!summary.dateRange && summary.transactions.length > MAX_TRANSACTIONS_TO_SHOW) {
      text += `, showing top ${MAX_TRANSACTIONS_TO_SHOW} by amount`;
    } else if (summary.dateRange && summary.dateRange.startDate && summary.dateRange.endDate) {
      const startStr = summary.dateRange.startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const endStr = summary.dateRange.endDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      text += ` for ${startStr === endStr ? startStr : `${startStr} to ${endStr}`}`;
    }
    text += `):\n\n`;

    // Group transactions by type for better organization
    const incomeTransactions = transactionsToShow.filter(t => t.type === 'INCOME');
    const expenseTransactions = transactionsToShow.filter(t => t.type === 'EXPENSE');

    if (incomeTransactions.length > 0) {
      const totalIncome = incomeTransactions.length;
      const allIncome = summary.transactions.filter(t => t.type === 'INCOME').length;
      const showCount = summary.dateRange || totalIncome === allIncome ? totalIncome : `${totalIncome} of ${allIncome}`;
      text += `Income Transactions (${showCount}):\n`;
      incomeTransactions.forEach((t) => {
        const dateStr = t.date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        const desc = t.description || 'No description';
        const category = t.category ? ` [Category: ${t.category.name}]` : '';
        text += `- ${dateStr}: ₹${t.amount.toLocaleString('en-IN')} - ${desc}${category}\n`;
      });
      text += '\n';
    }

    if (expenseTransactions.length > 0) {
      const totalExpense = expenseTransactions.length;
      const allExpense = summary.transactions.filter(t => t.type === 'EXPENSE').length;
      const showCount = summary.dateRange || totalExpense === allExpense ? totalExpense : `${totalExpense} of ${allExpense}`;
      text += `Expense Transactions (${showCount}):\n`;
      expenseTransactions.forEach((t) => {
        const dateStr = t.date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        const desc = t.description || 'No description';
        const category = t.category ? ` [Category: ${t.category.name}]` : '';

        // Clearly distinguish between store (business) and person
        const store = t.store ? ` [Business/Store: ${t.store}]` : '';
        const person = t.personName ? ` [Person: ${t.personName}]` : '';
        text += `- ${dateStr}: ₹${t.amount.toLocaleString('en-IN')} - ${desc}${category}${store}${person}\n`;
      });
      text += '\n';
    }

    // Add summary statistics
    const largeTransactions = summary.transactions.filter(t => t.amount >= 15000);
    if (largeTransactions.length > 0) {
      text += `Large Transactions (≥ ₹15,000): ${largeTransactions.length} transactions totaling ₹${largeTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN')}\n\n`;
    }
  }

  return text;
}


