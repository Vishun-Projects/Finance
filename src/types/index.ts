// Database Types
/**
 * Represents a user in the database.
 */
export interface User {
  /**
   * The unique identifier for the user.
   */
  id: string
  /**
   * The user's email address.
   */
  email: string
  name?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Represents a category for income or expenses.
 */
export interface Category {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  color?: string
  icon?: string
  isDefault: boolean
  userId?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Represents a source of income.
 */
export interface IncomeSource {
  id: string
  name: string
  amount: number
  frequency: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  categoryId?: string
  startDate: Date
  endDate?: Date
  notes?: string
  isActive: boolean
  userId: string
  createdAt: Date
  updatedAt: Date
  category?: Category
}

/**
 * Represents an expense.
 */
export interface Expense {
  id: string
  amount: number
  description?: string
  date: Date
  categoryId?: string
  isRecurring: boolean
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  notes?: string
  receiptUrl?: string
  userId: string
  createdAt: Date
  updatedAt: Date
  category?: Category
}

/**
 * Represents a financial deadline.
 */
export interface Deadline {
  id: string
  title: string
  amount: number
  dueDate: Date
  isRecurring: boolean
  frequency?: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  paymentMethod?: string
  accountDetails?: string
  notes?: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Represents a financial goal.
 */
export interface Goal {
  id: string
  title: string
  targetAmount: number
  currentAmount: number
  targetDate?: Date
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category?: string
  description?: string
  imageUrl?: string
  isActive: boolean
  userId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Represents a user's news preferences.
 */
export interface NewsPreference {
  id: string
  keywords: string
  sources?: string
  frequency: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Represents a cached news item.
 */
export interface NewsCache {
  id: string
  title: string
  content: string
  source: string
  url: string
  publishedAt: Date
  relevance: number
  keywords: string
  createdAt: Date
}

/**
 * Represents a financial report.
 */
export interface FinancialReport {
  id: string
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  period: string
  data: string
  insights?: string
  userId: string
  createdAt: Date
}

// API Response Types
/**
 * Represents a standard API response.
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Represents a paginated API response.
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Form Types
/**
 * Represents the form for creating an income source.
 */
export interface CreateIncomeSourceForm {
  name: string
  amount: number
  frequency: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  categoryId?: string
  startDate: Date
  endDate?: Date
  notes?: string
}

/**
 * Represents the form for creating an expense.
 */
export interface CreateExpenseForm {
  amount: number
  description?: string
  date: Date
  categoryId?: string
  isRecurring: boolean
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  notes?: string
}

/**
 * Represents the form for creating a deadline.
 */
export interface CreateDeadlineForm {
  title: string
  amount: number
  dueDate: Date
  isRecurring: boolean
  frequency?: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  paymentMethod?: string
  accountDetails?: string
  notes?: string
}

/**
 * Represents the form for creating a goal.
 */
export interface CreateGoalForm {
  title: string
  targetAmount: number
  targetDate?: Date
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category?: string
  description?: string
}

// Dashboard Types
/**
 * Represents the statistics displayed on the dashboard.
 */
export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  savingsRate: number
  upcomingDeadlines: number
  activeGoals: number
  financialHealthScore: number
}

/**
 * Represents the data for the cash flow chart.
 */
export interface CashFlowData {
  month: string
  income: number
  expenses: number
  netFlow: number
}

/**
 * Represents the data for the expense by category chart.
 */
export interface ExpenseByCategory {
  category: string
  amount: number
  percentage: number
  color: string
}

/**
 * Represents the data for the income by category chart.
 */
export interface IncomeByCategory {
  category: string
  amount: number
  percentage: number
  color: string
}

// Chart Types
/**
 * Represents the data for a chart.
 */
export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
  }[]
}

// News Types
/**
 * Represents a news item.
 */
export interface NewsItem {
  id: string
  title: string
  content: string
  source: string
  url: string
  publishedAt: Date
  relevance: number
  keywords: string[]
}

// Financial Health Types
/**
 * Represents the metrics for financial health.
 */
export interface FinancialHealthMetrics {
  savingsRate: number
  debtToIncomeRatio: number
  emergencyFundRatio: number
  investmentRatio: number
  overallScore: number
}

// Notification Types
/**
 * Represents a notification.
 */
export interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

// Filter Types
/**
 * Represents a date range for filtering.
 */
export interface DateRange {
  startDate: Date
  endDate: Date
}

/**
 * Represents the filters for transactions.
 */
export interface TransactionFilters {
  dateRange?: DateRange
  categoryId?: string
  minAmount?: number
  maxAmount?: number
  search?: string
}

// Export Types
/**
 * Represents the options for exporting data.
 */
export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel'
  dateRange?: DateRange
  includeCategories?: boolean
  includeNotes?: boolean
}