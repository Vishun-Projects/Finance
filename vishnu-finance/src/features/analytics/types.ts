export interface AnalyticsMonthPoint {
  month: string; // YYYY-MM
  label: string; // e.g. Apr 24
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
}

export type AnalyticsPeriodPreset = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';

export interface AnalyticsRange {
  preset: AnalyticsPeriodPreset;
  startDate: string | null;
  endDate: string | null;
}

export interface AnalyticsCategoryPoint {
  name: string;
  amount: number;
  percentage: number;
}

export interface AnalyticsIncomeBreakdown {
  salary: number;
  family: number;
  friends: number;
  other: number;
  total: number;
}

export interface AnalyticsSalaryPoint {
  date: string;
  label: string;
  takeHome: number;
  ctc: number;
}

export interface AnalyticsGoalProjection {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  remaining: number;
  progressPct: number;
  targetDate: string | null;
  avgMonthlySavings: number;
  monthsToGoal: number | null;
  projectedDate: string | null;
  onTrack: boolean | null;
  reachable: boolean;
  note: string;
}

export interface AnalyticsPayeePoint {
  name: string;
  amount: number;
  count: number;
}

export interface AnalyticsWeekdayPoint {
  day: string;
  amount: number;
  count: number;
}

export interface AnalyticsCategoryTrendPoint {
  name: string;
  baselineAvg: number;
  recentAvg: number;
  increase: number;
  increasePct: number;
  shareOfExpense: number;
  incomeSensitivity: number;
  variability: number;
  flexibleScore: number;
}

export interface AnalyticsPatternInsights {
  spendGrowthPct: number;
  incomeGrowthPct: number;
  expenseIncomeCorrelation: number;
  recentAverageExpense: number;
  baselineAverageExpense: number;
  spendConcentrationPct: number;
  topFlexibleCategories: AnalyticsCategoryTrendPoint[];
}

export interface AnalyticsBootstrap {
  months: AnalyticsMonthPoint[];
  expenseCategories: AnalyticsCategoryPoint[];
  incomeCategories: AnalyticsCategoryPoint[];
  incomeBreakdown: AnalyticsIncomeBreakdown;
  salaryHistory: AnalyticsSalaryPoint[];
  goals: AnalyticsGoalProjection[];
  topPayees: AnalyticsPayeePoint[];
  weekdaySpend: AnalyticsWeekdayPoint[];
  patternInsights: AnalyticsPatternInsights;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    avgMonthlyIncome: number;
    avgMonthlyExpenses: number;
    avgMonthlySavings: number;
    avgSavingsRate: number;
    txnCount: number;
    firstDate: string | null;
    lastDate: string | null;
    bankBalance: number;
  };
  kpis: {
    netSaved: {
      value: number;
      deltaPct: number | null;
      trend: number[];
    };
    avgMonthlySaved: {
      value: number;
      deltaPct: number | null;
      trend: number[];
    };
    bankBalance: {
      value: number;
      deltaPct: number | null;
      trend: number[];
    };
  };
  range: AnalyticsRange;
}
