export interface User {
  id: string;
  email: string;
  name?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Income {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  amount: number;
  description?: string;
  date: Date;
  categoryId?: string;
  isRecurring: boolean;
  frequency?: string;
  notes?: string;
  receiptUrl?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WishlistItem {
  id: string;
  title: string;
  description?: string;
  estimatedCost: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: string;
  targetDate?: Date;
  isCompleted: boolean;
  completedDate?: Date;
  imageUrl?: string;
  notes?: string;
  tags?: string[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deadline {
  id: string;
  title: string;
  description?: string;
  amount?: number;
  dueDate: Date;
  isRecurring: boolean;
  frequency?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  isCompleted: boolean;
  completedDate?: Date;
  category?: string;
  paymentMethod?: string;
  accountDetails?: string;
  notes?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
  icon?: string;
  isDefault: boolean;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryStructure {
  id: string;
  jobTitle: string;
  company: string;
  baseSalary: number;
  allowances?: Record<string, number>;
  deductions?: Record<string, number>;
  effectiveDate: Date;
  endDate?: Date;
  isActive: boolean;
  currency: string;
  location?: string;
  department?: string;
  grade?: string;
  notes?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryHistory {
  id: string;
  salaryStructureId: string;
  jobTitle: string;
  company: string;
  baseSalary: number;
  allowances?: Record<string, number>;
  deductions?: Record<string, number>;
  effectiveDate: Date;
  endDate?: Date;
  currency: string;
  location?: string;
  department?: string;
  grade?: string;
  changeType: 'PROMOTION' | 'TRANSFER' | 'COMPANY_CHANGE' | 'LOCATION_CHANGE' | 'DEPARTMENT_CHANGE' | 'SALARY_REVISION' | 'OTHER';
  changeReason?: string;
  userId: string;
  createdAt: Date;
}

export interface RecurringItem {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'DEADLINE';
  title: string;
  amount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  startDate: Date;
  endDate?: Date;
  category?: string;
  description?: string;
  isActive: boolean;
  lastProcessed?: Date;
  nextDueDate: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancialReport {
  id: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  period: string;
  data: string;
  insights?: string;
  userId: string;
  createdAt: Date;
}

export interface NewsPreference {
  id: string;
  keywords: string[];
  sources?: string[];
  frequency: 'daily' | 'weekly' | 'real-time';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics and Dashboard Types
export interface FinancialTrends {
  monthlyIncome: { month: string; amount: number }[];
  monthlyExpenses: { month: string; amount: number }[];
  monthlySavings: { month: string; amount: number }[];
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  goalProgress: { goal: string; current: number; target: number; percentage: number }[];
  wishlistProgress: { item: string; cost: number; priority: string; status: string }[];
}

export interface DashboardMetrics {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  upcomingDeadlines: number;
  activeGoals: number;
  wishlistItems: number;
  monthlyTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface AIInsight {
  title: string;
  content: string;
  source: string;
  relevance: number;
  category: 'investment' | 'savings' | 'tax' | 'market' | 'general';
  url?: string;
  publishedAt?: Date;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  volume?: number;
}

export interface GoalRecommendation {
  goalId: string;
  title: string;
  recommendation: string;
  estimatedSavings: number;
  timeframe: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface WishlistRecommendation {
  itemId: string;
  title: string;
  currentPrice: number;
  priceHistory: { date: string; price: number }[];
  bestTimeToBuy: string;
  pricePrediction: string;
  alternatives: { name: string; price: number; url: string }[];
}
