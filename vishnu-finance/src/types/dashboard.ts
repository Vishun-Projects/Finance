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
    description?: string | null;
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
  topPayees: Array<{ name: string; amount: number; count: number }>;
  dynamicInsights: Array<{ type: 'pattern' | 'warning' | 'positive'; message: string }>;
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
    adjustedIncome: number;
    adjustedExpenses: number;
    adjustedNetFlow: number;
  };
  incomeBreakdown: {
    salary: number;
    family: number;
    other: number;
    total: number;
  };
}
