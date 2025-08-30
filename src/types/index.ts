// Database Types
export interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
  updatedAt: Date
}

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

export interface NewsPreference {
  id: string
  keywords: string
  sources?: string
  frequency: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

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
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Form Types
export interface CreateIncomeSourceForm {
  name: string
  amount: number
  frequency: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  categoryId?: string
  startDate: Date
  endDate?: Date
  notes?: string
}

export interface CreateExpenseForm {
  amount: number
  description?: string
  date: Date
  categoryId?: string
  isRecurring: boolean
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  notes?: string
}

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

export interface CreateGoalForm {
  title: string
  targetAmount: number
  targetDate?: Date
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category?: string
  description?: string
}

// Dashboard Types
export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  savingsRate: number
  upcomingDeadlines: number
  activeGoals: number
  financialHealthScore: number
}

export interface CashFlowData {
  month: string
  income: number
  expenses: number
  netFlow: number
}

export interface ExpenseByCategory {
  category: string
  amount: number
  percentage: number
  color: string
}

export interface IncomeByCategory {
  category: string
  amount: number
  percentage: number
  color: string
}

// Chart Types
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
export interface FinancialHealthMetrics {
  savingsRate: number
  debtToIncomeRatio: number
  emergencyFundRatio: number
  investmentRatio: number
  overallScore: number
}

// Notification Types
export interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

// Filter Types
export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface TransactionFilters {
  dateRange?: DateRange
  categoryId?: string
  minAmount?: number
  maxAmount?: number
  search?: string
}

// Export Types
export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel'
  dateRange?: DateRange
  includeCategories?: boolean
  includeNotes?: boolean
}