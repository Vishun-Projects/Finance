/**
 * Transaction Utility Functions
 * Helper functions for transaction management, filtering, and formatting
 */

import { Transaction, TransactionCategory } from '@/types';

export interface TransactionFilters {
  financialCategory?: TransactionCategory | 'ALL';
  categoryId?: string;
  categoryName?: string;
  store?: string;
  personName?: string;
  upiId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  amountPreset?: 'all' | 'lt1k' | '1to10k' | '10to50k' | '50to100k' | 'gt100k';
  entityType?: 'STORE' | 'PERSON' | 'BOTH';
  searchTerm?: string;
  isDeleted?: boolean;
}

export interface SortConfig {
  field: 'date' | 'amount' | 'description' | 'category';
  direction: 'asc' | 'desc';
}

/**
 * Get transaction amount (credit or debit)
 */
export function getTransactionAmount(transaction: Transaction): number {
  return transaction.creditAmount > 0 ? transaction.creditAmount : transaction.debitAmount;
}

/**
 * Get transaction type label
 */
export function getTransactionType(transaction: Transaction): 'credit' | 'debit' {
  return transaction.creditAmount > 0 ? 'credit' : 'debit';
}

/**
 * Apply amount preset filter
 */
export function applyAmountPreset(amount: number, preset: TransactionFilters['amountPreset']): boolean {
  if (!preset || preset === 'all') return true;
  
  switch (preset) {
    case 'lt1k':
      return amount < 1000;
    case '1to10k':
      return amount >= 1000 && amount < 10000;
    case '10to50k':
      return amount >= 10000 && amount < 50000;
    case '50to100k':
      return amount >= 50000 && amount < 100000;
    case 'gt100k':
      return amount >= 100000;
    default:
      return true;
  }
}

/**
 * Filter transactions based on filters
 */
export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  return transactions.filter(transaction => {
    // Financial category filter
    if (filters.financialCategory && filters.financialCategory !== 'ALL') {
      if (transaction.financialCategory !== filters.financialCategory) {
        return false;
      }
    }
    
    // Category filter
    if (filters.categoryId && transaction.categoryId !== filters.categoryId) {
      return false;
    }
    if (filters.categoryName && transaction.category?.name !== filters.categoryName) {
      return false;
    }
    
    // Date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      if (new Date(transaction.transactionDate) < startDate) {
        return false;
      }
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // Include full end date
      if (new Date(transaction.transactionDate) > endDate) {
        return false;
      }
    }
    
    // Amount filters
    const amount = getTransactionAmount(transaction);
    if (filters.minAmount && amount < filters.minAmount) {
      return false;
    }
    if (filters.maxAmount && amount > filters.maxAmount) {
      return false;
    }
    if (filters.amountPreset && !applyAmountPreset(amount, filters.amountPreset)) {
      return false;
    }
    
    // Entity filters
    if (filters.entityType && filters.entityType !== 'BOTH') {
      if (filters.entityType === 'STORE' && !transaction.store) {
        return false;
      }
      if (filters.entityType === 'PERSON' && !transaction.personName) {
        return false;
      }
    }
    
    // Store filter
    if (filters.store && transaction.store !== filters.store) {
      return false;
    }
    
    // Person filter
    if (filters.personName && transaction.personName !== filters.personName) {
      return false;
    }
    
    // UPI ID filter
    if (filters.upiId && transaction.upiId !== filters.upiId) {
      return false;
    }
    
    // Search term filter (searches in description, store, personName, upiId)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matchesDescription = transaction.description?.toLowerCase().includes(searchLower);
      const matchesStore = transaction.store?.toLowerCase().includes(searchLower);
      const matchesPerson = transaction.personName?.toLowerCase().includes(searchLower);
      const matchesUpi = transaction.upiId?.toLowerCase().includes(searchLower);
      
      if (!matchesDescription && !matchesStore && !matchesPerson && !matchesUpi) {
        return false;
      }
    }
    
    // Deleted filter
    if (filters.isDeleted !== undefined && transaction.isDeleted !== filters.isDeleted) {
      return false;
    }
    
    return true;
  });
}

/**
 * Sort transactions
 */
export function sortTransactions(
  transactions: Transaction[],
  sortConfig: SortConfig
): Transaction[] {
  const sorted = [...transactions];
  
  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortConfig.field) {
      case 'date':
        aValue = new Date(a.transactionDate).getTime();
        bValue = new Date(b.transactionDate).getTime();
        break;
      case 'amount':
        aValue = getTransactionAmount(a);
        bValue = getTransactionAmount(b);
        break;
      case 'description':
        aValue = (a.description || '').toLowerCase();
        bValue = (b.description || '').toLowerCase();
        break;
      case 'category':
        aValue = (a.category?.name || '').toLowerCase();
        bValue = (b.category?.name || '').toLowerCase();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

/**
 * Group transactions by date
 */
export function groupTransactionsByDate(
  transactions: Transaction[]
): Record<string, Transaction[]> {
  return transactions.reduce((groups, transaction) => {
    const dateKey = new Date(transaction.transactionDate).toISOString().split('T')[0];
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);
}

/**
 * Calculate totals by category
 */
export function calculateTotalsByCategory(transactions: Transaction[]): {
  income: number;
  expense: number;
  byCategory: Record<string, { income: number; expense: number }>;
} {
  let income = 0;
  let expense = 0;
  const byCategory: Record<string, { income: number; expense: number }> = {};
  
  transactions.forEach(transaction => {
    const amount = getTransactionAmount(transaction);
    const categoryName = transaction.category?.name || 'Uncategorized';
    
    if (!byCategory[categoryName]) {
      byCategory[categoryName] = { income: 0, expense: 0 };
    }
    
    if (transaction.creditAmount > 0) {
      income += amount;
      byCategory[categoryName].income += amount;
    } else {
      expense += amount;
      byCategory[categoryName].expense += amount;
    }
  });
  
  return { income, expense, byCategory };
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatTransactionDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}
