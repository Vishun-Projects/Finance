export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  phone?: string;
  dateOfBirth?: Date;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  occupation?: string;
  bio?: string;
  isActive: boolean;
  status?: 'ACTIVE' | 'FROZEN' | 'SUSPENDED';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  role: 'USER' | 'SUPERUSER';
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

export type TransactionCategory = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER';

export interface Transaction {
  id: string;
  userId: string;
  transactionDate: Date;
  description?: string;
  creditAmount: number;
  debitAmount: number;
  financialCategory: TransactionCategory;
  categoryId?: string;
  accountStatementId?: string;
  // Bank-specific fields
  bankCode?: string;
  transactionId?: string;
  accountNumber?: string;
  transferType?: string;
  personName?: string;
  upiId?: string;
  branch?: string;
  store?: string;
  rawData?: string;
  balance?: number;
  // Metadata
  notes?: string;
  receiptUrl?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  category?: Category;
  documentId?: string;
  document?: Document;
}

export type DocumentVisibility = 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC';
export type DocumentSourceType = 'USER_UPLOAD' | 'BANK_STATEMENT' | 'PORTAL_RESOURCE' | 'SYSTEM';

export interface Document {
  id: string;
  ownerId?: string | null;
  uploadedById: string;
  deletedById?: string | null;
  deletedBy?: { id: string; email?: string | null; name?: string | null } | null;
  storageKey: string;
  originalName: string;
  mimeType: string;
  fileSize?: number | null;
  checksum?: string | null;
  visibility: DocumentVisibility;
  sourceType: DocumentSourceType;
  sourceReference?: string | null;
  bankCode?: string | null;
  parsedAt?: Date | null;
  metadata?: string | null; // JSON string
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  isDeleted: boolean;
}

export interface BankFieldMapping {
  id: string;
  bankCode: string;
  fieldKey: string;
  mappedTo: string;
  description?: string | null;
  version: number;
  isActive: boolean;
  mappingConfig?: Record<string, unknown> | null;
  createdById: string;
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
