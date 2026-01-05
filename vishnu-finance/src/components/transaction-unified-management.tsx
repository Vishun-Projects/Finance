'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, Filter, X, RefreshCw, CheckSquare, Square, Trash2, RotateCw, Tag, Layers, ChevronLeft, ChevronRight, Sparkles, Check, Calendar as CalendarIcon, FileText, Upload, AlertCircle, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useToast } from '../contexts/ToastContext';
import { Transaction, TransactionCategory } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import TransactionCard from './transaction-card';
import TransactionFormModal, { TransactionFormData } from './transaction-form-modal';
import FabButton from './ui/fab-button';
import MobileHeader from './ui/mobile-header';
import FilterSheet from './ui/filter-sheet';
import QuickRangeChips, { QuickRange } from './ui/quick-range-chips';
import { DateRangeFilter } from './ui/date-range-filter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Combobox } from './ui/combobox';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { calculateTotalsByCategory, formatCurrency } from '@/lib/transaction-utils';
import { cn } from '@/lib/utils';
import type { ISODateRange } from '@/lib/date-range';
import DeleteConfirmationDialog from './delete-confirmation-dialog';

interface BankTransaction {
  debit?: number | string;
  credit?: number | string;
  description?: string;
  date?: string;
  date_iso?: string;
  category?: string;
  narration?: string;
  bankCode?: string;
  transactionId?: string;
  accountNumber?: string;
  transferType?: string;
  personName?: string;
  upiId?: string;
  branch?: string;
  store?: string;
  commodity?: string;
  rawData?: string;
  raw?: string;
  remarks?: string;
  financialCategory?: string;
  balance?: number | string;
  [key: string]: unknown;
}

export interface TransactionsBootstrap {
  transactions?: Transaction[];
  categories?: { id: string; name: string; type: 'INCOME' | 'EXPENSE'; color?: string }[];
  pagination?: { total: number; page: number; pageSize: number; totalPages: number };
  totals?: { income: number; expense: number } | null;
  range?: ISODateRange;
  userId?: string;
}

interface TransactionUnifiedManagementProps {
  bootstrap?: TransactionsBootstrap;
}

export default function TransactionUnifiedManagement({ bootstrap }: TransactionUnifiedManagementProps = {}) {
  const { user } = useAuth();
  const { formatCurrency: formatCurrencyFunc } = useCurrency();
  const { success, error: showError } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const resolvedUserId = user?.id ?? bootstrap?.userId ?? null;
  const bootstrapRange = bootstrap?.range;

  // State
  const [transactions, setTransactions] = useState<Transaction[]>(bootstrap?.transactions ?? []);
  const [categories, setCategories] = useState<{ id: string; name: string; type: 'INCOME' | 'EXPENSE'; color?: string }[]>(
    bootstrap?.categories ?? [],
  );
  const [isLoading, setIsLoading] = useState(!(bootstrap?.transactions && bootstrap.transactions.length > 0));
  const [pagination, setPagination] = useState(bootstrap?.pagination ?? { total: 0, page: 1, pageSize: 50, totalPages: 0 });
  const [apiTotals, setApiTotals] = useState<{ income: number; expense: number } | null>(bootstrap?.totals ?? null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selection state (always available, no separate mode)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkCategorize, setShowBulkCategorize] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  // Inline debug info
  const [parseDebug, setParseDebug] = useState<any>(null);
  const [importDebug, setImportDebug] = useState<any>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showSelectionMode, setShowSelectionMode] = useState(false); // Toggle checkbox visibility

  // PDF Import state
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<BankTransaction[]>([]);
  const [statementMetadata, setStatementMetadata] = useState<any>(null);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [previewMonthOnly, setPreviewMonthOnly] = useState<boolean>(false);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [previewPageSize, setPreviewPageSize] = useState<number>(200);
  const [parseProgress, setParseProgress] = useState<number>(0);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [tempFiles, setTempFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [categorizationProgress, setCategorizationProgress] = useState<{
    total: number;
    categorized: number;
    progress: number;
    isActive: boolean;
  } | null>(null);

  const hasBootstrapTransactionsRef = useRef(Boolean(bootstrap?.transactions?.length));
  const hasBootstrapCategoriesRef = useRef(Boolean(bootstrap?.categories?.length));
  const filterBarRef = useRef<HTMLDivElement | null>(null);
  const selectionToolbarRef = useRef<HTMLDivElement | null>(null);
  const [filterPulse, setFilterPulse] = useState(false);
  const [selectionPulse, setSelectionPulse] = useState(false);

  // Filters from URL
  const financialCategory = (searchParams.get('type') as TransactionCategory | 'ALL') || 'ALL';
  const searchTerm = searchParams.get('search') || '';
  const startDateParam = searchParams.get('startDate') || '';
  const endDateParam = searchParams.get('endDate') || '';
  const quickRange = (searchParams.get('range') as QuickRange) || 'month';
  const pageParam = parseInt(searchParams.get('page') || '1');
  const amountPreset = (searchParams.get('amountPreset') as 'all' | 'lt1k' | '1to10k' | '10to50k' | '50to100k' | 'gt100k') || 'all';
  const categoryIdParam = searchParams.get('categoryId') || '';

  // Compute date range from quick range
  const computeRange = useCallback((range: QuickRange): [string, string] => {
    const today = new Date();
    switch (range) {
      case 'month':
        return [
          new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
          new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0],
        ];
      case 'lastMonth': {
        const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return [
          new Date(prev.getFullYear(), prev.getMonth(), 1).toISOString().split('T')[0],
          new Date(prev.getFullYear(), prev.getMonth() + 1, 0).toISOString().split('T')[0],
        ];
      }
      case 'quarter': {
        const q = Math.floor(today.getMonth() / 3);
        return [
          new Date(today.getFullYear(), q * 3, 1).toISOString().split('T')[0],
          new Date(today.getFullYear(), (q + 1) * 3, 0).toISOString().split('T')[0],
        ];
      }
      case 'year':
        return [
          new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0],
          new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0],
        ];
      case 'all':
        return [
          new Date(2020, 0, 1).toISOString().split('T')[0],
          new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0],
        ];
      case 'custom':
      default:
        if (startDateParam && endDateParam) {
          return [startDateParam, endDateParam];
        }
        const now = new Date();
        return [
          new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        ];
    }
  }, [startDateParam, endDateParam]);

  // Sync date range with quickRange
  const [startDate, endDate] = useMemo(() => {
    if (startDateParam && endDateParam) {
      return [startDateParam, endDateParam];
    }

    if (bootstrapRange) {
      return [bootstrapRange.startDate, bootstrapRange.endDate];
    }

    return computeRange(quickRange);
  }, [startDateParam, endDateParam, quickRange, computeRange, bootstrapRange]);

  // Local filter state
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryIdParam);
  const [dateRangePickerOpen, setDateRangePickerOpen] = useState(false);

  // Update local dates when URL params change
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  // Update selected category when URL param changes
  useEffect(() => {
    setSelectedCategoryId(categoryIdParam);
  }, [categoryIdParam]);

  useEffect(() => {
    if (!filterPulse) return;
    const timeout = window.setTimeout(() => setFilterPulse(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [filterPulse]);

  useEffect(() => {
    if (!selectionPulse) return;
    const timeout = window.setTimeout(() => setSelectionPulse(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [selectionPulse]);

  // Update URL params
  const updateURLParams = useCallback((updates: Record<string, string | null>) => {
    if (resolvedUserId) {
      setIsLoading(true);
    }
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/transactions?${params.toString()}`);
  }, [router, searchParams, resolvedUserId]);

  // Apply quick range
  const applyQuickRange = useCallback((range: QuickRange) => {
    const [start, end] = computeRange(range);
    updateURLParams({ range, startDate: start, endDate: end, page: '1' }); // Reset to page 1
  }, [computeRange, updateURLParams]);

  // Determine page size based on date range
  const getPageSize = useCallback(() => {
    // For "all time" or large date ranges, use larger page size
    if (quickRange === 'all' || (startDate && endDate &&
      new Date(endDate).getTime() - new Date(startDate).getTime() > 365 * 24 * 60 * 60 * 1000)) {
      return '1000'; // Large page size for all time queries
    }
    return '100'; // Default page size
  }, [quickRange, startDate, endDate]);

  // Fetch transactions with pagination
  const fetchTransactions = useCallback(async ({ showSpinner = true }: { showSpinner?: boolean } = {}) => {
    if (!resolvedUserId) return;

    if (showSpinner) {
      setIsLoading(true);
    }
    try {
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transactions_list',
          page: pageParam,
          pageSize: getPageSize(),
          includeTotals: true,
          type: financialCategory !== 'ALL' ? financialCategory : undefined,
          categoryId: selectedCategoryId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: searchTerm || undefined,
          includeDeleted: showDeleted,
          sortField: 'transactionDate',
          sortDirection: 'desc',
          amountPreset: amountPreset !== 'all' ? amountPreset : undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');

      const data = await response.json();
      setTransactions(data.transactions || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
      setApiTotals(data.totals ?? null);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showError('Error', 'Failed to load transactions');
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
    }
  }, [resolvedUserId, financialCategory, searchTerm, startDate, endDate, showDeleted, pageParam, getPageSize, showError, amountPreset, selectedCategoryId]);

  // Fetch all categories (not just those with transactions)
  const fetchCategories = useCallback(async () => {
    if (!resolvedUserId) return;

    try {
      // Fetch all categories - show ALL categories, not just used ones
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'categories_list' }),
      });
      if (response.ok) {
        const allCategories = await response.json() || [];
        setCategories(allCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [resolvedUserId]);

  // Effects
  useEffect(() => {
    if (!resolvedUserId) {
      return;
    }

    if (hasBootstrapCategoriesRef.current) {
      hasBootstrapCategoriesRef.current = false;
      return;
    }

    fetchCategories();
  }, [resolvedUserId, fetchCategories]);

  useEffect(() => {
    if (!resolvedUserId) {
      return;
    }

    const showSpinner = !hasBootstrapTransactionsRef.current;
    hasBootstrapTransactionsRef.current = false;
    fetchTransactions({ showSpinner });
  }, [resolvedUserId, fetchTransactions]);

  // Update local search when URL changes
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  // Handle search with debounce
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateURLParams({ search: value || null, page: '1' });
      }, 500);
    };
  }, [updateURLParams]);

  const handleSearch = useCallback((value: string) => {
    setLocalSearch(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Calculate totals - use API totals if available, otherwise calculate from visible transactions
  const totals = useMemo(() => {
    if (apiTotals) {
      return apiTotals;
    }
    return calculateTotalsByCategory(transactions);
  }, [apiTotals, transactions]);

  // Filtered transactions (already filtered by API)
  const filteredTransactions = useMemo(() => {
    return transactions;
  }, [transactions]);

  const formatAmount = useCallback(
    (value: number) => {
      const safeValue = Number.isFinite(value) ? value : 0;
      return formatCurrencyFunc ? formatCurrencyFunc(safeValue) : formatCurrency(safeValue);
    },
    [formatCurrencyFunc],
  );

  const overviewMetrics = useMemo(() => {
    const income = totals?.income ?? 0;
    const expense = totals?.expense ?? 0;
    return {
      income,
      expense,
      net: income - expense,
      count: filteredTransactions.length,
    };
  }, [totals, filteredTransactions]);

  const { income, expense, net, count } = overviewMetrics;

  const rangeLabel = useMemo(() => {
    const labelByRange: Record<string, string> = {
      month: 'This month',
      lastMonth: 'Last month',
      quarter: 'This quarter',
      year: 'This year',
      all: 'All time',
    };
    if (labelByRange[quickRange]) {
      return labelByRange[quickRange];
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const sameYear = start.getFullYear() === end.getFullYear();
        const startLabel = format(start, sameYear ? 'd MMM' : 'd MMM yyyy');
        const endLabel = format(end, 'd MMM yyyy');
        return `${startLabel} - ${endLabel}`;
      }
    }
    return 'Custom range';
  }, [quickRange, startDate, endDate]);

  const rangeSummary = useMemo(() => {
    if (!startDate || !endDate) {
      return '';
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return '';
    }
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const startLabel = format(start, 'd MMM yyyy');
    const endLabel = format(end, 'd MMM yyyy');
    return `${startLabel} - ${endLabel} (${diffDays} day${diffDays > 1 ? 's' : ''})`;
  }, [startDate, endDate]);

  const totalRecords = useMemo(() => {
    return pagination.total && pagination.total > 0 ? pagination.total : count;
  }, [count, pagination.total]);

  const desktopMetrics = useMemo(
    () => [
      {
        key: 'income',
        label: 'Income',
        value: formatAmount(income),
        helper: 'Inflow this range',
        tone: 'text-emerald-600 dark:text-emerald-400',
      },
      {
        key: 'expense',
        label: 'Spends',
        value: formatAmount(expense),
        helper: 'Outflow this range',
        tone: 'text-rose-500 dark:text-rose-400',
      },
      {
        key: 'net',
        label: 'Net flow',
        value: formatAmount(net),
        helper: 'Income minus spends',
        tone: net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400',
      },
    ],
    [expense, formatAmount, income, net],
  );

  // Handle save
  const handleSave = useCallback(async (data: TransactionFormData) => {
    try {
      const transactionId = editingTransaction?.id;
      const action = transactionId ? 'transactions_update' : 'transactions_create';

      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(transactionId ? { id: transactionId } : {}),
          ...data,
        }),
      });

      if (!response.ok) throw new Error('Failed to save transaction');

      success('Success', transactionId ? 'Transaction updated' : 'Transaction added');
      setShowForm(false);
      setEditingTransaction(null);
      fetchTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
      showError('Error', 'Failed to save transaction');
    }
  }, [editingTransaction, fetchTransactions, success, showError]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deletingTransaction) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transactions_delete_single',
          id: deletingTransaction.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to delete transaction');

      success('Success', 'Transaction deleted');
      setShowDeleteDialog(false);
      setDeletingTransaction(null);
      setSelectedIds(new Set());
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showError('Error', 'Failed to delete transaction');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingTransaction, fetchTransactions, success, showError]);

  // Bulk operations
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  }, [selectedIds.size, filteredTransactions]);

  const handleSelectOne = useCallback((id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }, [selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, [setSelectedIds]);

  const clearAllFilters = useCallback(() => {
    setLocalSearch('');
    setSelectedCategoryId('');
    updateURLParams({
      search: null,
      type: null,
      range: null,
      startDate: null,
      endDate: null,
      amountPreset: null,
      categoryId: null,
      page: '1',
    });
  }, [updateURLParams]);

  const openFilterSheet = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setFilterPulse(true);
      requestAnimationFrame(() => {
        filterBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    setIsFilterOpen(true);
  }, []);

  const openImportDialog = useCallback(() => {
    setShowFileDialog(true);
  }, [setShowFileDialog]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) {
      showError('Error', 'Please select transactions to delete');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transactions_delete_bulk',
          transactionIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) throw new Error('Failed to delete transactions');

      const data = await response.json();
      success('Success', `Deleted ${data.deletedCount || selectedIds.size} transaction(s)`);
      setSelectedIds(new Set());
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transactions:', error);
      showError('Error', 'Failed to delete transactions');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, fetchTransactions, success, showError]);

  const handleBulkRestore = useCallback(async () => {
    const deletedSelected = Array.from(selectedIds).filter(id => {
      const transaction = transactions.find(t => t.id === id);
      return transaction?.isDeleted;
    });

    if (deletedSelected.length === 0) {
      showError('Error', 'Please select deleted transactions to restore');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transactions_restore',
          transactionIds: deletedSelected,
        }),
      });

      if (!response.ok) throw new Error('Failed to restore transactions');

      const data = await response.json();
      success('Success', `Restored ${data.restoredCount || deletedSelected.length} transaction(s)`);
      setSelectedIds(new Set());
      fetchTransactions();
    } catch (error) {
      console.error('Error restoring transactions:', error);
      showError('Error', 'Failed to restore transactions');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, transactions, fetchTransactions, success, showError]);

  // Auto-categorize using full categorization service (rules + AI + patterns)
  const handleAutoCategorizeByUpiAccount = useCallback(async () => {
    if (selectedIds.size === 0) {
      showError('Error', 'Please select transactions to categorize');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const selectedTransactions = transactions.filter(t => selectedIds.has(t.id) && !t.categoryId);

      if (selectedTransactions.length === 0) {
        showError('Info', 'All selected transactions are already categorized');
        setIsBulkUpdating(false);
        return;
      }

      console.log(`🤖 Starting auto-categorization for ${selectedTransactions.length} transactions...`);

      // Prepare transactions for categorization API
      const transactionsToCategorize = selectedTransactions.map(t => {
        // Handle transactionDate - could be Date object or string
        let dateStr = '';
        if (t.transactionDate) {
          if (t.transactionDate instanceof Date) {
            dateStr = t.transactionDate.toISOString().split('T')[0];
          } else {
            // Handle as Date or string (from Prisma)
            const dateValue = t.transactionDate as Date | string;
            if (typeof dateValue === 'string') {
              // Already a string, extract date part if needed
              dateStr = dateValue.split('T')[0].substring(0, 10);
            } else {
              // Try to convert to Date
              const date = new Date(dateValue as any);
              if (!isNaN(date.getTime())) {
                dateStr = date.toISOString().split('T')[0];
              }
            }
          }
        }

        return {
          description: t.description || '',
          store: t.store || undefined,
          commodity: t.notes || undefined,
          amount: (t.creditAmount > 0 ? t.creditAmount : t.debitAmount) || 0,
          date: dateStr || new Date().toISOString().split('T')[0], // Fallback to today if invalid
          financialCategory: t.financialCategory as 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER',
          personName: t.personName || undefined,
          upiId: t.upiId || undefined,
          accountNumber: t.accountNumber || undefined,
          accountHolderName: user?.name || undefined,
        };
      });

      // Call categorization API endpoint
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transactions_categorize',
          userId: user?.id,
          transactions: transactionsToCategorize,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to categorize transactions' }));
        throw new Error(error.error || 'Failed to categorize transactions');
      }

      const categorizationResults = await response.json();

      if (!Array.isArray(categorizationResults) || categorizationResults.length !== selectedTransactions.length) {
        throw new Error('Invalid categorization response');
      }

      // Apply categorization results using batch update to avoid rate limiting
      const updates = selectedTransactions
        .map((t, idx) => {
          const result = categorizationResults[idx];
          if (result && result.categoryId) {
            return {
              id: t.id,
              categoryId: result.categoryId,
              financialCategory: result.financialCategory || t.financialCategory,
            };
          }
          return null;
        })
        .filter((u): u is NonNullable<typeof u> => u !== null);

      if (updates.length === 0) {
        showError('Info', 'No categories could be determined for the selected transactions. Try categorizing a few manually first to build patterns.');
        setIsBulkUpdating(false);
        return;
      }

      // Use batch update endpoint to avoid 429 rate limit errors
      const batchResponse = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transactions_batch_update',
          userId: user?.id,
          updates,
        }),
      });

      if (!batchResponse.ok) {
        const error = await batchResponse.json().catch(() => ({ error: 'Failed to update transactions' }));
        throw new Error(error.error || 'Failed to update transactions');
      }

      const batchResult = await batchResponse.json();
      const successCount = batchResult.succeeded || 0;
      const categorizedCount = categorizationResults.filter(r => r.categoryId).length;

      if (successCount > 0) {
        success('Success', `Auto-categorized ${successCount} transaction(s) using AI and rule-based categorization`);
      } else if (categorizedCount > 0) {
        showError('Warning', `Found categories for ${categorizedCount} transactions but failed to apply them`);
      } else {
        showError('Info', 'No categories could be determined for the selected transactions. Try categorizing a few manually first to build patterns.');
      }

      setSelectedIds(new Set());
      setShowBulkCategorize(false);
      setBulkCategoryId('');
      fetchTransactions();
    } catch (error) {
      console.error('Error auto-categorizing transactions:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to auto-categorize transactions');
    } finally {
      setIsBulkUpdating(false);
    }
  }, [selectedIds, transactions, user, fetchTransactions, success, showError]);

  const handleBulkCategorize = useCallback(async () => {
    if (selectedIds.size === 0 || !bulkCategoryId) {
      showError('Error', 'Please select transactions and a category');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const updates = Array.from(selectedIds).map(id => ({
        id,
        categoryId: bulkCategoryId,
      }));

      // Update transactions one by one (or create bulk endpoint)
      const results = await Promise.allSettled(
        updates.map(update =>
          fetch('/api/app', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'transactions_update',
              id: update.id,
              categoryId: update.categoryId,
            }),
          })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      success('Success', `Updated category for ${successCount} transaction(s)`);
      setSelectedIds(new Set());
      setShowBulkCategorize(false);
      setBulkCategoryId('');
      fetchTransactions();
    } catch (error) {
      console.error('Error categorizing transactions:', error);
      showError('Error', 'Failed to categorize transactions');
    } finally {
      setIsBulkUpdating(false);
    }
  }, [selectedIds, bulkCategoryId, fetchTransactions, success, showError]);

  const typeOptions = [
    { value: 'ALL', label: 'All Types' },
    { value: 'INCOME', label: 'Income' },
    { value: 'EXPENSE', label: 'Expense' },
    { value: 'TRANSFER', label: 'Transfer' },
    { value: 'INVESTMENT', label: 'Investment' },
    { value: 'OTHER', label: 'Other' },
  ];

  const amountOptions = [
    { value: 'all', label: 'All' },
    { value: 'lt1k', label: '<1k' },
    { value: '1to10k', label: '1–10k' },
    { value: '10to50k', label: '10–50k' },
    { value: '50to100k', label: '50–100k' },
    { value: 'gt100k', label: '>100k' },
  ];

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (financialCategory && financialCategory !== 'ALL') {
      const typeLabel: Record<string, string> = {
        INCOME: 'Income',
        EXPENSE: 'Expense',
        TRANSFER: 'Transfer',
        INVESTMENT: 'Investment',
        OTHER: 'Other',
      };
      filters.push(typeLabel[financialCategory] ?? 'Type filter');
    }
    if (amountPreset && amountPreset !== 'all') {
      const amountLabel: Record<string, string> = {
        lt1k: '<1k',
        '1to10k': '1–10k',
        '10to50k': '10–50k',
        '50to100k': '50–100k',
        gt100k: '>100k',
      };
      filters.push(amountLabel[amountPreset] ?? 'Amount filter');
    }
    if (selectedCategoryId) {
      const categoryLabel = categories.find((cat) => cat.id === selectedCategoryId)?.name;
      if (categoryLabel) {
        filters.push(categoryLabel);
      }
    }
    if (searchTerm) {
      filters.push(`Search: "${searchTerm}"`);
    }
    if (showDeleted) {
      filters.push('Including deleted');
    }
    return filters;
  }, [amountPreset, categories, financialCategory, searchTerm, selectedCategoryId, showDeleted]);

  const heroChips = useMemo(() => {
    const chips: string[] = [];
    chips.push(`${totalRecords.toLocaleString()} record${totalRecords === 1 ? '' : 's'}`);
    if (rangeSummary) {
      chips.push(rangeSummary);
    }
    if (activeFilters.length > 0) {
      chips.push(`${activeFilters.length} active filter${activeFilters.length > 1 ? 's' : ''}`);
    }
    return chips;
  }, [activeFilters.length, rangeSummary, totalRecords]);

  interface FocusRow {
    key: string;
    icon: LucideIcon;
    label: string;
    primary: string;
    secondary: string;
    actionLabel?: string;
    onAction?: () => void;
  }

  const focusRows: FocusRow[] = useMemo(() => {
    const rows: FocusRow[] = [];

    if (activeFilters.length > 0) {
      const filtersSummary =
        activeFilters.length > 1
          ? `${activeFilters[0]} • +${activeFilters.length - 1} more`
          : activeFilters[0];
      rows.push({
        key: 'filters',
        icon: Filter,
        label: 'Filters active',
        primary: filtersSummary,
        secondary: 'Filters from the toolbar are currently applied.',
        actionLabel: 'Review filters',
        onAction: openFilterSheet,
      });
    }

    if (showSelectionMode || selectedIds.size > 0) {
      rows.push({
        key: 'selection',
        icon: CheckSquare,
        label: 'Selection mode',
        primary:
          selectedIds.size > 0
            ? `${selectedIds.size} ready for bulk actions`
            : 'Selection mode is turned on',
        secondary: 'Exit selection when you are done with bulk edits.',
        actionLabel: selectedIds.size > 0 ? 'Clear selected' : 'Exit selection',
        onAction: selectedIds.size > 0 ? clearSelection : () => setShowSelectionMode(false),
      });
    }

    if (isImporting || parsedTransactions.length > 0) {
      rows.push({
        key: 'import',
        icon: Upload,
        label: 'Importer',
        primary: isImporting
          ? 'Import in progress — keep this tab open.'
          : `${parsedTransactions.length} parsed entries waiting`,
        secondary: 'Continue in the importer from the toolbar.',
        actionLabel: 'Open importer',
        onAction: openImportDialog,
      });
    }

    if (rows.length === 0) {
      rows.push({
        key: 'all-clear',
        icon: Check,
        label: 'All clear',
        primary: 'Nothing needs attention right now.',
        secondary: 'Use the toolbar to filter, select, or import whenever you need.',
      });
    }

    return rows;
  }, [
    activeFilters,
    clearSelection,
    isImporting,
    openFilterSheet,
    openImportDialog,
    parsedTransactions.length,
    selectedIds.size,
    showSelectionMode,
  ]);

  // Filtered parsed transactions for preview
  const filteredParsed = useMemo(() => {
    if (!previewMonthOnly) {
      return parsedTransactions;
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return parsedTransactions.filter((t: BankTransaction) => {
      const dStr = (t.date_iso || t.date || '').toString().slice(0, 10);
      const d = dStr ? new Date(dStr) : null;
      return d && d >= start && d <= end;
    });
  }, [parsedTransactions, previewMonthOnly]);

  // Calculate actual totals from parsed transactions
  const actualTotals = useMemo(() => {
    let totalCredits = 0;
    let totalDebits = 0;

    parsedTransactions.forEach((t: BankTransaction) => {
      const creditAmount = typeof t.credit === 'number' ? t.credit : parseFloat(String(t.credit || '0'));
      const debitAmount = typeof t.debit === 'number' ? t.debit : parseFloat(String(t.debit || '0'));

      if (creditAmount > 0) {
        totalCredits += creditAmount;
      }
      if (debitAmount > 0) {
        totalDebits += debitAmount;
      }
    });

    return { totalCredits, totalDebits };
  }, [parsedTransactions]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredParsed.length / previewPageSize)), [filteredParsed.length, previewPageSize]);
  const visibleParsed = useMemo(() => {
    const startIdx = (previewPage - 1) * previewPageSize;
    return filteredParsed.slice(startIdx, startIdx + previewPageSize);
  }, [filteredParsed, previewPage, previewPageSize]);

  // Handle multi-format file selection
  const handleMultiFormatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const supportedTypes = ['application/pdf'];
      const supportedExtensions = ['.pdf'];
      const hasValidType = supportedTypes.includes(file.type);
      const hasValidExtension = supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (!hasValidType && !hasValidExtension) {
        setFileError('Please select a valid PDF file');
        return;
      }
      setSelectedFile(file);
      setFileError(null);
      // Auto-parse the file after selection
      setTimeout(() => handleParseFile(file), 100);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const supportedTypes = ['application/pdf'];
      const supportedExtensions = ['.pdf'];
      const hasValidType = supportedTypes.includes(file.type);
      const hasValidExtension = supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (hasValidType || hasValidExtension) {
        setSelectedFile(file);
        setFileError(null);
        // Auto-parse the file after drop
        setTimeout(() => handleParseFile(file), 100);
      } else {
        setFileError('Please drop a valid PDF file');
      }
    }
  };

  // Parse file and extract transactions
  const handleParseFile = async (fileToParse?: File) => {
    const file = fileToParse || selectedFile;
    if (!file || !user?.id) return;

    setIsParsingFile(true);
    setParseProgress(5);
    setFileError(null);
    setParseDebug(null);
    setImportDebug(null);

    try {
      // Simulate progressive parse progress up to 90%
      const parseTimer = setInterval(() => {
        setParseProgress((p) => (p < 90 ? Math.min(90, p + 5) : p));
      }, 400);
      const lowerName = file.name.toLowerCase();

      const fd = new FormData();
      fd.append('pdf', file);
      // Simple bank auto-detect from filename
      const bank = ['sbi', 'hdfc', 'icici', 'axis', 'bob', 'kotak', 'yes'].find(b => lowerName.includes(b)) || '';
      const bankToSend = (selectedBank || bank);
      if (bankToSend) fd.append('bank', bankToSend);

      const res = await fetch('/api/parse-pdf', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to parse PDF');
      }
      const data = await res.json();
      if (data?.debug) setParseDebug(data.debug);

      const transactionsToSet = data.transactions || [];
      setParsedTransactions(transactionsToSet);
      setStatementMetadata(data.metadata || null);
      setTempFiles(data.tempFiles || []);
      setShowCsvPreview(true);
      setShowFileDialog(false);

      success('PDF Parsed', `Extracted ${data.count || transactionsToSet.length} transactions`);
      setParseProgress(100);
      clearInterval(parseTimer);
    } catch (error) {
      console.error('Error parsing file:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setIsParsingFile(false);
      setTimeout(() => setParseProgress(0), 1000);
    }
  };

  // Import parsed transactions using batch API
  // Poll for categorization progress
  const pollCategorizationProgress = async (transactionIds: string[], userId: string) => {
    const maxAttempts = 60; // Poll for up to 5 minutes (5 second intervals)
    let attempts = 0;

    // Set initial progress state
    setCategorizationProgress({
      total: transactionIds.length,
      categorized: 0,
      progress: 0,
      isActive: true,
    });

    const poll = async () => {
      try {
        const response = await fetch('/api/app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'transactions_categorize_background_status',
            userId,
            transactionIds,
          }),
        });

        if (response.ok) {
          const status = await response.json();
          const progress = status.progress || 0;
          const categorized = status.categorized || 0;
          const total = status.total || transactionIds.length;

          // Update progress state
          setCategorizationProgress({
            total,
            categorized,
            progress,
            isActive: true,
          });

          if (progress >= 100 || status.remaining === 0) {
            // Categorization complete
            setCategorizationProgress({
              total,
              categorized,
              progress: 100,
              isActive: false,
            });
            success(`✅ Categorization complete! ${categorized} transactions categorized.`);
            // Refresh transactions to show updated categories
            router.refresh();
            // Clear progress after 3 seconds
            setTimeout(() => setCategorizationProgress(null), 3000);
            return;
          }

          // Continue polling if not complete
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            // Max attempts reached, but keep showing progress
            setCategorizationProgress({
              total,
              categorized,
              progress,
              isActive: true, // Keep active so user knows it's still running
            });
            success(`⏱️ Categorization in progress: ${categorized}/${total} completed. It will continue in the background.`);
          }
        }
      } catch (error) {
        console.error('Error polling categorization status:', error);
        // Don't show error to user - it's background process
        // But keep progress visible
      }
    };

    // Start polling after 2 seconds
    setTimeout(poll, 2000);
  };

  const handleImportParsedTransactions = async () => {
    if (!parsedTransactions.length || !user?.id) return;

    setIsImporting(true);
    setImportProgress(5);
    setFileError(null);

    try {
      // Normalize to format expected by import-bank-statement API
      const normalized = parsedTransactions
        .map((t) => {
          try {
            // Extract only primitive values to avoid circular references
            const debitAmount = typeof t.debit === 'number' ? t.debit : parseFloat(String(t.debit || '0'));
            const creditAmount = typeof t.credit === 'number' ? t.credit : parseFloat(String(t.credit || '0'));
            const description = String(t.description || t.narration || '').trim();

            // Validate that we have either debit or credit, and a description
            if ((debitAmount === 0 && creditAmount === 0) || !description) {
              return null;
            }

            // Use date_iso if available (preferred), otherwise fall back to date
            let dateStr = '';
            let dateIsoStr = '';

            if (t.date_iso) {
              dateIsoStr = String(t.date_iso).slice(0, 10);
              dateStr = dateIsoStr;
            } else if (t.date) {
              const dateInput = String(t.date);
              // Check if already in ISO format
              if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.slice(0, 10))) {
                dateIsoStr = dateInput.slice(0, 10);
                dateStr = dateIsoStr;
              } else {
                // Try to parse the date
                try {
                  const parsedDate = new Date(dateInput);
                  if (!isNaN(parsedDate.getTime())) {
                    const year = parsedDate.getFullYear();
                    if (year >= 2020 && year <= 2026) {
                      dateIsoStr = parsedDate.toISOString().slice(0, 10);
                      dateStr = dateIsoStr;
                    }
                  }
                } catch {
                  // If parsing fails, try extracting date pattern
                  const dateMatch = dateInput.match(/(\d{4}-\d{2}-\d{2})/);
                  if (dateMatch) {
                    try {
                      const parsedDate = new Date(dateMatch[0]);
                      if (!isNaN(parsedDate.getTime())) {
                        dateIsoStr = parsedDate.toISOString().slice(0, 10);
                        dateStr = dateIsoStr;
                      }
                    } catch { }
                  }
                }
              }
            }

            // Validate date format is correct (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            const isValidDate = dateStr && dateRegex.test(dateStr);

            if (!isValidDate) {
              console.warn('⚠️ Invalid date for transaction:', { date: t.date, date_iso: t.date_iso, dateStr });
              return null;
            }

            // Return in format expected by import-bank-statement API
            return {
              debit: debitAmount,
              credit: creditAmount,
              description: description,
              title: description, // API accepts either description or title
              date: dateStr,
              date_iso: dateIsoStr || dateStr, // Prefer date_iso for better parsing
              category: t.category ? String(t.category) : '',
              notes: t.commodity || '',
              // Bank-specific fields
              bankCode: t.bankCode || null,
              transactionId: t.transactionId || null,
              accountNumber: t.accountNumber || null,
              transferType: t.transferType || null,
              personName: t.personName || null,
              upiId: t.upiId || null,
              branch: t.branch || null,
              store: t.store || null,
              commodity: t.commodity || null,
              raw: t.raw || t.rawData || null,
              rawData: t.raw || t.rawData || null,
              balance: t.balance ? (typeof t.balance === 'number' ? t.balance : parseFloat(String(t.balance))) : null,
            };
          } catch (error) {
            console.warn('⚠️ Error normalizing transaction:', error);
            return null;
          }
        })
        .filter(Boolean);

      if (!normalized.length) {
        showError('No valid records', 'No transactions to import');
        setIsImporting(false);
        return;
      }

      // Simulate import progress up to 90% while waiting for server
      const importTimer = setInterval(() => {
        setImportProgress((p) => (p < 90 ? Math.min(90, p + 4) : p));
      }, 300);

      // Use bank statement import API which handles bank-specific fields
      // Note: type is optional, API will infer from credit/debit amounts
      const primaryTempFile = tempFiles[0];
      const documentMeta = selectedFile && primaryTempFile ? {
        storageKey: primaryTempFile,
        originalName: selectedFile.name,
        mimeType: selectedFile.type || 'application/pdf',
        fileSize: selectedFile.size,
      } : undefined;

      // Use background categorization for large imports (>100 transactions) for better performance
      const useBackgroundCategorization = normalized.length > 100;

      const importPayload: any = {
        userId: user.id,
        records: normalized,
        useAICategorization: true, // Enable AI categorization
        categorizeInBackground: useBackgroundCategorization, // Use background for large imports
        validateBalance: true, // Enable balance validation
        ...(documentMeta ? { document: documentMeta } : {}),
      };

      // Add metadata if available
      if (statementMetadata) {
        importPayload.metadata = statementMetadata;
      }

      // Update progress message
      setImportProgress(10);
      console.log('📤 Sending import request with AI categorization and balance validation...');

      const response = await fetch('/api/import-bank-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importPayload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Batch import failed');
      }
      const result = await response.json();
      if (result) setImportDebug({ request: { count: normalized.length, useAICategorization: true, categorizeInBackground: useBackgroundCategorization }, response: result });
      const incomeCount = result.incomeInserted || 0;
      const expenseCount = result.expenseInserted || 0;
      const totalInserted = result.inserted || (incomeCount + expenseCount);

      let message = `Inserted ${totalInserted} records (${incomeCount} income, ${expenseCount} expenses), ${result.duplicates || 0} duplicates`;

      // Handle background categorization
      if (result.backgroundCategorization?.started) {
        message += `. 🚀 Background categorization started for ${result.backgroundCategorization.total} transactions`;

        // Start polling for categorization progress
        if (result.backgroundCategorization.transactionIds?.length > 0) {
          pollCategorizationProgress(result.backgroundCategorization.transactionIds, user.id);
        }
      } else if (result.categorizedCount !== undefined) {
        // Show immediate categorization results
        message += `. ${result.categorizedCount} transactions auto-categorized`;
      }

      // Show balance validation results
      if (result.balanceValidationResult) {
        const validation = result.balanceValidationResult;
        if (!validation.isValid && validation.discrepancy > 1.0) {
          // Only show as failed if there's a significant discrepancy
          message += `. ⚠️ Balance validation failed (discrepancy: ₹${validation.discrepancy?.toFixed(2) || 'N/A'})`;
        } else if (validation.discrepancy > 0.01 && validation.discrepancy <= 1.0) {
          message += `. ⚠️ Minor balance discrepancy: ₹${validation.discrepancy.toFixed(2)}`;
        } else if (validation.discrepancy <= 0.01) {
          message += `. ✅ Balance validation passed`;
        } else {
          // No discrepancy calculated or validation passed
          message += `. ✅ Balance validated`;
        }

        if (!validation.accountNumberValid) {
          message += `. ⚠️ Account number not extracted`;
        }
      } else if (result.balanceValidation?.warning) {
        message += `. Note: ${result.balanceValidation.warning}`;
      }

      // Display warnings
      if (result.warnings && result.warnings.length > 0) {
        const warningMessages = result.warnings.slice(0, 5); // Show first 5 warnings
        warningMessages.forEach((warning: string) => {
          console.warn('  -', warning);
        });
        if (result.warnings.length > 5) {
          console.warn(`  ... and ${result.warnings.length - 5} more warnings`);
        }
      }

      // Display errors
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((error: string) => {
          showError('Import Error', error);
        });
      }

      // Show detailed balance validation summary if available
      if (result.balanceValidationResult?.summary) {
        console.log('Balance Validation Summary:', result.balanceValidationResult.summary);
      }

      success('Imported', message);
      setImportProgress(100);
      clearInterval(importTimer);
      // Refetch transactions
      await fetchTransactions();

      // Clean up temporary files after successful import
      if (tempFiles.length > 0) {
        const filesToCleanup = documentMeta
          ? tempFiles.filter((path) => path !== documentMeta.storageKey)
          : tempFiles;

        if (filesToCleanup.length > 0) {
          try {
            await fetch('/api/cleanup-temp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ files: filesToCleanup }),
            });
            setTempFiles(documentMeta ? [documentMeta.storageKey] : []);
          } catch (error) {
            console.warn('⚠️ Cleanup error, but import succeeded:', error);
          }
        }

        // Close preview dialog
        setShowCsvPreview(false);
        setParsedTransactions([]);
        setSelectedFile(null);
      }
    } catch (e) {
      console.error('Batch import error', e);
      setFileError(e instanceof Error ? e.message : 'Batch import failed');
      showError('Import failed', e instanceof Error ? e.message : 'Batch import failed');
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportProgress(0), 1000);
    }
  };

  return (
    <div className="w-full bg-background pb-16 md:pb-20 lg:pb-6">
      {/* Always-visible Debug Panels */}
      <div className="px-4 md:px-6 lg:px-8 mt-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-3 bg-card">
          <div className="text-sm font-semibold mb-1">Parser Debug (PDF parsing)</div>
          {parseDebug ? (
            <>
              {parseDebug.method && (
                <p className="text-xs mb-1"><span className="font-medium">Method:</span> {parseDebug.method}</p>
              )}
              {parseDebug.explanation && (
                <p className="text-xs mb-2 text-muted-foreground">{parseDebug.explanation}</p>
              )}
              {parseDebug.codeFiles && Array.isArray(parseDebug.codeFiles) && (
                <div className="mb-2">
                  <p className="text-xs font-medium">Code files referenced:</p>
                  <ul className="list-disc pl-4 text-xs">
                    {parseDebug.codeFiles.map((f: string, idx: number) => (<li key={idx}>{f}</li>))}
                  </ul>
                </div>
              )}
              <pre className="text-xs overflow-auto max-h-64 bg-muted/40 p-2 rounded">{JSON.stringify(parseDebug, null, 2)}</pre>
            </>
          ) : (
            <pre className="text-xs overflow-auto max-h-64 bg-muted/40 p-2 rounded">
              {JSON.stringify({ message: 'No parse data yet. Select a PDF and click Parse.' }, null, 2)}
            </pre>
          )}
        </div>
        <div className="rounded-lg border p-3 bg-card">
          <div className="text-sm font-semibold mb-1">Import Debug (DB import)</div>
          {importDebug ? (
            <>
              {importDebug.request && (
                <p className="text-xs mb-1"><span className="font-medium">Requested:</span> {importDebug.request.count} transactions, AI={String(importDebug.request.useAICategorization)}, Background={String(importDebug.request.categorizeInBackground)}</p>
              )}
              <pre className="text-xs overflow-auto max-h-64 bg-muted/40 p-2 rounded">{JSON.stringify(importDebug, null, 2)}</pre>
            </>
          ) : (
            <pre className="text-xs overflow-auto max-h-64 bg-muted/40 p-2 rounded">
              {JSON.stringify({ message: 'No import yet. After parsing, click Import to see details.' }, null, 2)}
            </pre>
          )}
        </div>
      </div>
      {/* Categorization Progress Indicator - Mobile */}
      {categorizationProgress && categorizationProgress.isActive && (
        <div className="md:hidden sticky top-0 z-50 bg-primary/10 border-b border-primary/20 backdrop-blur-sm">
          <div className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-medium truncate">
                    Auto-categorizing...
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {categorizationProgress.categorized}/{categorizationProgress.total}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 rounded-full"
                    style={{ width: `${categorizationProgress.progress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 text-center">
                  {categorizationProgress.progress}% complete
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <MobileHeader
        title="Transactions"
        subtitle={`${pagination.total > 0 ? `${pagination.total.toLocaleString()} total` : `${filteredTransactions.length} shown`}${selectedIds.size > 0 ? ` • ${selectedIds.size} selected` : ''}`}
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !showSelectionMode;
                setShowSelectionMode(next);
                if (!next) {
                  setSelectedIds(new Set());
                }
              }}
              className={`p-2 rounded-md hover:bg-muted ${showSelectionMode ? 'bg-primary/10' : ''}`}
              aria-label={showSelectionMode ? 'Exit selection mode' : 'Enter selection mode'}
            >
              <CheckSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFileDialog(true)}
              className="p-2 rounded-md hover:bg-muted"
              aria-label="Open importer"
            >
              <FileText className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(true)}
                className="p-2 rounded-md hover:bg-muted"
                aria-label="Filters"
              >
                <Filter className="w-5 h-5" />
              </button>
              {(financialCategory !== 'ALL' || searchTerm || quickRange !== 'month' || amountPreset !== 'all' || selectedCategoryId) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
              )}
            </div>
          </div>
        }
      />

      {/* Categorization Progress Indicator */}
      {categorizationProgress && categorizationProgress.isActive && (
        <div className="sticky top-0 z-50 bg-primary/10 border-b border-primary/20 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-medium">
                  Auto-categorizing transactions...
                </span>
                <span className="text-xs text-muted-foreground">
                  {categorizationProgress.categorized}/{categorizationProgress.total} ({categorizationProgress.progress}%)
                </span>
              </div>
              <div className="w-32 md:w-48 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${categorizationProgress.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      <div className="hidden md:block sticky top-16 z-30 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Transactions</h1>
              <p className="text-sm text-muted-foreground">
                {pagination.total > 0 ? `${pagination.total.toLocaleString()} total` : `${filteredTransactions.length} shown`}
                {selectedIds.size > 0 && ` • ${selectedIds.size} selected`}
                {financialCategory !== 'ALL' && ` • ${typeOptions.find(o => o.value === financialCategory)?.label}`}
                {selectedCategoryId && categories.find(c => c.id === selectedCategoryId) && ` • ${categories.find(c => c.id === selectedCategoryId)?.name}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkCategorize(true)}
                    disabled={isBulkUpdating}
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Categorize ({selectedIds.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedIds.size})
                  </Button>
                  {showDeleted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkRestore}
                      disabled={isDeleting}
                    >
                      <RotateCw className="w-4 h-4 mr-2" />
                      Restore ({selectedIds.size})
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedIds(new Set());
                      setShowSelectionMode(false);
                    }}
                  >
                    Clear Selection
                  </Button>
                </>
              )}
              <Button
                variant={showSelectionMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  const next = !showSelectionMode;
                  setShowSelectionMode(next);
                  if (next) {
                    setSelectionPulse(true);
                    if (typeof window !== 'undefined') {
                      window.requestAnimationFrame(() => {
                        selectionToolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      });
                    }
                  } else {
                    setSelectedIds(new Set());
                    setSelectionPulse(false);
                  }
                }}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                {showSelectionMode ? 'Exit selection mode' : 'Selection mode'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFileDialog(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Open importer
              </Button>
              <Button onClick={() => {
                setEditingTransaction(null);
                setShowForm(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Overview */}
      <div className="hidden md:block border-b border-border/60 bg-background/80">
        <div className="container mx-auto px-4 pb-6 pt-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)]">
            <Card className="relative overflow-hidden border border-border/60 bg-card/95 text-card-foreground shadow-sm backdrop-blur-sm dark:border-border/40 dark:bg-background/80">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/0 to-primary/0 dark:from-primary/25 dark:via-primary/10 dark:to-transparent" />
              <CardHeader className="relative z-10 space-y-4 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Overview</span>
                  </div>
                  <Badge variant="outline" className="rounded-full border-border/50 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground dark:bg-muted/20">
                    {rangeLabel}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold text-foreground">Cashflow snapshot</CardTitle>
                  <CardDescription className="max-w-xl text-sm text-muted-foreground">
                    Track inflow versus spend for the selected period. Numbers update automatically as you filter.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4 pb-5">
                <div className="grid gap-3 lg:grid-cols-3">
                  {desktopMetrics.map((metric) => (
                    <div
                      key={metric.key}
                      className="rounded-2xl border border-border/60 bg-muted/20 p-4 dark:border-border/40 dark:bg-muted/10"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                      <p className={`text-lg font-semibold ${metric.tone}`}>{metric.value}</p>
                      <p className="text-xs text-muted-foreground">{metric.helper}</p>
                    </div>
                  ))}
                </div>
                {heroChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {heroChips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground dark:bg-muted/20"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border border-border/60 bg-card/95 text-card-foreground shadow-sm dark:border-border/40 dark:bg-background/80">
              <CardHeader className="space-y-3 pb-4">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <CardTitle className="text-xl font-semibold text-foreground">Next actions</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  Desktop shortcuts to keep reconciliations moving. Mobile retains the compact view you already use.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                {focusRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div
                      key={row.key}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3 dark:border-border/40 dark:bg-muted/10"
                    >
                      <div className="flex items-start gap-3">
                        <span className="rounded-full bg-primary/10 p-2 text-primary dark:bg-primary/20">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</p>
                          <p className="text-sm font-medium text-foreground">{row.primary}</p>
                          <p className="text-xs text-muted-foreground">{row.secondary}</p>
                        </div>
                      </div>
                      {row.actionLabel && row.onAction ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-mr-1 mt-1 text-sm font-medium text-primary"
                          onClick={row.onAction}
                        >
                          {row.actionLabel}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Selection Toolbar - Only show when selection mode is active */}
      {showSelectionMode && (
        <div
          ref={selectionToolbarRef}
          className={`sticky top-16 md:top-32 z-20 border-b px-4 py-2 transition-shadow ${selectionPulse ? 'bg-primary/10 shadow-[0_0_0_3px_rgba(59,130,246,0.25)]' : 'bg-primary/5'
            }`}
        >
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm hover:bg-primary/10"
              >
                {selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0 ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Select All</span>
                <span className="sm:hidden">All</span>
              </button>
              {selectedIds.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => {
                    setShowDeleted(e.target.checked);
                    setSelectedIds(new Set());
                  }}
                  className="rounded"
                />
                <span className="hidden sm:inline">Show Deleted</span>
                <span className="sm:hidden">Deleted</span>
              </label>
            </div>
          </div>
          {/* Mobile Action Buttons - Show when items are selected */}
          {selectedIds.size > 0 && (
            <div className="md:hidden mt-2 pt-2 border-t flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkCategorize(true)}
                disabled={isBulkUpdating}
                className="flex-1"
              >
                <Tag className="w-4 h-4 mr-2" />
                Categorize
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              {showDeleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkRestore}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Restore
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Filter Chips - Mobile Only (Transaction Types) - Shown only when filter sheet is closed */}
      {!isFilterOpen && (
        <div className={`md:hidden sticky ${showSelectionMode ? 'top-28 md:top-40' : 'top-16 md:top-32'} z-20 bg-background/95 backdrop-blur border-b px-4 py-2.5`}>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {typeOptions.map((option) => {
              const isActive = financialCategory === option.value || (option.value === 'ALL' && financialCategory === 'ALL');
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateURLParams({ type: option.value, page: '1' })} // Reset to page 1
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  aria-pressed={isActive}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters - Desktop Only */}
      <div
        ref={filterBarRef}
        className={`hidden md:block sticky ${showSelectionMode ? 'top-40' : 'top-32'} z-20 bg-background/95 backdrop-blur border-b transition-shadow ${filterPulse ? 'ring-2 ring-primary/40 shadow-lg' : ''
          }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr),minmax(0,2fr),minmax(0,1.6fr)]">
            {/* Search & category */}
            <div className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-sm dark:border-border/40 dark:bg-background/80">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Find transactions</span>
                {activeFilters.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs font-medium text-primary">
                    Reset all
                  </Button>
                )}
              </div>
              <div className="mt-3 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search description, store, person, or notes"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {localSearch && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Category</span>
                  <Select
                    value={selectedCategoryId || 'all'}
                    onValueChange={(value) => {
                      setSelectedCategoryId(value === 'all' ? '' : value);
                      updateURLParams({ categoryId: value === 'all' ? null : value, page: '1' });
                    }}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories
                        .filter((c) => !financialCategory || financialCategory === 'ALL' || c.type === financialCategory)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              {category.color && <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />}
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Type & amount */}
            <div className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-sm dark:border-border/40 dark:bg-background/80">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transaction type</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {typeOptions.map((option) => {
                    const isActive = financialCategory === option.value || (option.value === 'ALL' && financialCategory === 'ALL');
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateURLParams({ type: option.value, page: '1' })}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        aria-pressed={isActive}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount range</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {amountOptions.map((option) => {
                    const isActive = amountPreset === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateURLParams({ amountPreset: option.value === 'all' ? null : option.value, page: '1' })}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        aria-pressed={isActive}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Date & quality controls */}
            <div className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-sm dark:border-border/40 dark:bg-background/80">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date range</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    void fetchTransactions();
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="mt-3 overflow-hidden">
                <QuickRangeChips value={quickRange} onChange={applyQuickRange} className="w-full justify-start px-1" />
              </div>
              <div className="mt-3">
                <DateRangeFilter
                  startDate={localStartDate}
                  endDate={localEndDate}
                  onRangeChange={(start, end, preset) => {
                    setLocalStartDate(start);
                    setLocalEndDate(end);
                    updateURLParams({ startDate: start, endDate: end, range: preset });
                  }}
                  showPresets={false}
                  className="w-full"
                />
              </div>
              <label className="mt-4 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => {
                    setShowDeleted(e.target.checked);
                    setSelectedIds(new Set());
                  }}
                  className="h-3.5 w-3.5 rounded border-border"
                />
                Include deleted transactions
              </label>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground shadow-sm dark:border-border/40">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">Active filters</span>
              {activeFilters.map((badge) => (
                <span key={badge} className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Summary Cards - Compact, always 2 columns */}
        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4 md:hidden">
          <div className="bg-card rounded-lg border p-2.5 md:p-3">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Total Income</div>
            <div className="text-base sm:text-lg md:text-xl font-bold text-green-600 dark:text-green-400 truncate">
              {formatCurrency(totals.income)}
            </div>
          </div>
          <div className="bg-card rounded-lg border p-2.5 md:p-3">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Total Expense</div>
            <div className="text-base sm:text-lg md:text-xl font-bold text-red-600 dark:text-red-400 truncate">
              {formatCurrency(totals.expense)}
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg border p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 md:py-16">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2 font-medium">No transactions found</p>
            <p className="text-sm text-muted-foreground mb-6">
              {searchTerm || financialCategory !== 'ALL'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first transaction'}
            </p>
            {!showSelectionMode && (
              <Button onClick={() => {
                setEditingTransaction(null);
                setShowForm(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="relative">
                {showSelectionMode && (
                  <button
                    onClick={() => handleSelectOne(transaction.id)}
                    className={`absolute left-2 top-2 z-10 p-1.5 rounded-md bg-background/90 backdrop-blur shadow-sm border ${selectedIds.has(transaction.id) ? 'text-primary border-primary' : 'text-muted-foreground border-border'
                      }`}
                  >
                    {selectedIds.has(transaction.id) ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                )}
                <div
                  className={cn(
                    'overflow-hidden rounded-2xl',
                    showSelectionMode && selectedIds.has(transaction.id) && 'ring-2 ring-primary',
                  )}
                >
                  <TransactionCard
                    transaction={transaction}
                    onEdit={showSelectionMode || transaction.documentId ? undefined : (t) => {
                      // Disable edit for imported transactions (have documentId)
                      setEditingTransaction(t);
                      setShowForm(true);
                    }}
                    onDelete={showSelectionMode || transaction.documentId ? undefined : (t) => {
                      // Disable delete for imported transactions (have documentId)
                      setDeletingTransaction(t);
                      setShowDeleteDialog(true);
                    }}
                    currency="INR"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total.toLocaleString()} transactions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateURLParams({ page: (pagination.page - 1).toString() })}
                disabled={pagination.page === 1 || isLoading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateURLParams({ page: pageNum.toString() })}
                      disabled={isLoading}
                      className="min-w-[40px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateURLParams({ page: (pagination.page + 1).toString() })}
                disabled={pagination.page >= pagination.totalPages || isLoading}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Sheet - Mobile */}
      <FilterSheet open={isFilterOpen} onClose={() => setIsFilterOpen(false)}>
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b">
            <h2 className="text-lg font-semibold">Filters</h2>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="p-1 rounded-md hover:bg-muted"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-10 pr-4 py-2.5 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Transaction Type</label>
            <div className="grid grid-cols-2 gap-2">
              {typeOptions.map((option) => {
                const isActive = financialCategory === option.value || (option.value === 'ALL' && financialCategory === 'ALL');
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      updateURLParams({ type: option.value, page: '1' }); // Reset to page 1
                    }}
                    className={`px-4 py-2.5 rounded-md text-sm font-medium transition-all ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Amount Range</label>
            <div className="flex flex-wrap gap-2">
              {amountOptions.map((option) => {
                const isActive = amountPreset === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      updateURLParams({ amountPreset: option.value === 'all' ? null : option.value, page: '1' });
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      } border`}
                    aria-pressed={isActive}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Range */}
          <div>
            <label className="block text-sm font-medium mb-2">Quick Date Range</label>
            <QuickRangeChips value={quickRange} onChange={applyQuickRange} />
          </div>

          {/* Single Calendar Date Range Picker - Mobile */}
          <div>
            <label className="block text-sm font-medium mb-2">Custom Date Range</label>
            <Popover open={dateRangePickerOpen} onOpenChange={setDateRangePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localStartDate && localEndDate ? (
                    <>
                      {format(new Date(localStartDate), 'dd MMM yyyy')} - {format(new Date(localEndDate), 'dd MMM yyyy')}
                    </>
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={localStartDate ? new Date(localStartDate) : new Date()}
                  selected={{
                    from: localStartDate ? new Date(localStartDate) : undefined,
                    to: localEndDate ? new Date(localEndDate) : undefined,
                  }}
                  onSelect={(range: DateRange | undefined) => {
                    if (range?.from && range?.to) {
                      setLocalStartDate(range.from.toISOString().split('T')[0]);
                      setLocalEndDate(range.to.toISOString().split('T')[0]);
                      setDateRangePickerOpen(false);
                    } else if (range?.from) {
                      setLocalStartDate(range.from.toISOString().split('T')[0]);
                    }
                  }}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <Select value={selectedCategoryId || 'all'} onValueChange={(value) => {
              if (value === 'uncategorized') {
                setSelectedCategoryId('uncategorized');
                updateURLParams({ categoryId: 'uncategorized', page: '1' });
              } else {
                setSelectedCategoryId(value === 'all' ? '' : value);
                updateURLParams({ categoryId: value === 'all' ? null : value, page: '1' });
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {categories
                  .filter(c => !financialCategory || financialCategory === 'ALL' || c.type === financialCategory)
                  .map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        {category.color && (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        )}
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Apply Button */}
          <div className="pt-2 space-y-2">
            <Button
              className="w-full"
              onClick={() => {
                handleSearch(localSearch);
                updateURLParams({
                  startDate: localStartDate,
                  endDate: localEndDate,
                  categoryId: selectedCategoryId || null
                });
                setIsFilterOpen(false);
              }}
            >
              Apply Filters
            </Button>
            {(localSearch || financialCategory !== 'ALL' || quickRange !== 'month' || amountPreset !== 'all' || selectedCategoryId) && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setLocalSearch('');
                  updateURLParams({
                    search: null,
                    type: 'ALL',
                    range: 'month',
                    startDate: null,
                    endDate: null,
                    amountPreset: null,
                    categoryId: null
                  });
                  setSelectedCategoryId('');
                  setIsFilterOpen(false);
                }}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </div>
      </FilterSheet>

      {/* Bulk Categorize Modal */}
      {showBulkCategorize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => {
          setShowBulkCategorize(false);
          setBulkCategoryId('');
        }}>
          <div className="bg-background rounded-lg border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 md:p-6 border-b flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold">Categorize {selectedIds.size} Transaction{selectedIds.size !== 1 ? 's' : ''}</h2>
              <button
                onClick={() => {
                  setShowBulkCategorize(false);
                  setBulkCategoryId('');
                }}
                className="p-1 rounded-md hover:bg-muted"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 md:p-6">
              {/* Comprehensive Category List with Subcategories */}
              {categories.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No categories found</p>
                  <p className="text-sm text-muted-foreground">Please create categories first in Settings</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Income Categories */}
                  {categories.filter(c => c.type === 'INCOME').length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Income Categories
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {categories
                          .filter(c => c.type === 'INCOME')
                          .map(category => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setBulkCategoryId(category.id);
                              }}
                              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${bulkCategoryId === category.id
                                ? 'border-primary bg-primary/10 ring-2 ring-primary'
                                : 'border-border hover:bg-muted hover:border-primary/50'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                  {category.color && (
                                    <div
                                      className="w-4 h-4 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: category.color }}
                                    />
                                  )}
                                  <span className="font-medium text-sm">{category.name}</span>
                                </div>
                                {bulkCategoryId === category.id && (
                                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                )}
                              </div>
                              {/* Common subcategories for income */}
                              {category.name === 'Salary' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Regular, Bonus, Commission
                                </div>
                              )}
                              {category.name === 'Freelance' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Projects, Consulting, Services
                                </div>
                              )}
                              {category.name === 'Investment' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Dividends, Returns, Interest
                                </div>
                              )}
                              {category.name === 'Business' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Revenue, Profit, Sales
                                </div>
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Expense Categories */}
                  {categories.filter(c => c.type === 'EXPENSE').length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Expense Categories
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {categories
                          .filter(c => c.type === 'EXPENSE')
                          .map(category => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setBulkCategoryId(category.id);
                              }}
                              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${bulkCategoryId === category.id
                                ? 'border-primary bg-primary/10 ring-2 ring-primary'
                                : 'border-border hover:bg-muted hover:border-primary/50'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                  {category.color && (
                                    <div
                                      className="w-4 h-4 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: category.color }}
                                    />
                                  )}
                                  <span className="font-medium text-sm">{category.name}</span>
                                </div>
                                {bulkCategoryId === category.id && (
                                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                )}
                              </div>
                              {/* Common subcategories for expenses */}
                              {category.name === 'Food' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Groceries, Restaurants, Snacks, Beverages
                                </div>
                              )}
                              {category.name === 'Transportation' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Fuel, Taxi, Public Transport, Parking
                                </div>
                              )}
                              {category.name === 'Housing' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Rent, Mortgage, Maintenance, Repairs
                                </div>
                              )}
                              {category.name === 'Entertainment' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Movies, Games, Events, Subscriptions
                                </div>
                              )}
                              {category.name === 'Healthcare' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Doctor, Medicine, Insurance, Tests
                                </div>
                              )}
                              {category.name === 'Shopping' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Clothes, Electronics, Gifts, Online
                                </div>
                              )}
                              {category.name === 'Education' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Tuition, Books, Courses, Supplies
                                </div>
                              )}
                              {category.name === 'Utilities' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Electricity, Water, Internet, Phone
                                </div>
                              )}
                              {category.name === 'Insurance' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Health, Life, Vehicle, Property
                                </div>
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Show message if no categories match selected transaction types */}
                  {categories.filter(c => c.type === 'INCOME').length === 0 &&
                    categories.filter(c => c.type === 'EXPENSE').length === 0 && (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No categories available. Please create categories in Settings.
                      </div>
                    )}
                </div>
              )}
            </div>
            <div className="p-4 md:p-6 border-t space-y-3">
              {/* Auto-categorize by UPI/Account */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleAutoCategorizeByUpiAccount}
                disabled={isBulkUpdating}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Auto-categorize by UPI/Account Number
              </Button>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleBulkCategorize}
                  disabled={!bulkCategoryId || isBulkUpdating || categories.length === 0}
                >
                  {isBulkUpdating ? 'Updating...' : bulkCategoryId ? `Apply to ${selectedIds.size} Transaction${selectedIds.size !== 1 ? 's' : ''}` : 'Select a Category'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBulkCategorize(false);
                    setBulkCategoryId('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAB - Mobile */}
      {!showSelectionMode && (
        <FabButton
          icon={<Plus className="h-5 w-5" />}
          label="Add Transaction"
          onClick={() => {
            setEditingTransaction(null);
            setShowForm(true);
          }}
        />
      )}

      {/* Transaction Form Modal */}
      <TransactionFormModal
        open={showForm}
        transaction={editingTransaction}
        onClose={() => {
          setShowForm(false);
          setEditingTransaction(null);
        }}
        onSave={handleSave}
        categories={categories}
        defaultType={financialCategory !== 'ALL' ? financialCategory : 'EXPENSE'}
      />

      {/* File Parse Dialog */}
      {showFileDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => {
          setShowFileDialog(false);
          setSelectedFile(null);
          setFileError(null);
          setParsedTransactions([]);
          setShowCsvPreview(false);
        }}>
          <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 md:p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">Parse Financial Documents</h3>
              <button
                onClick={() => {
                  setShowFileDialog(false);
                  setSelectedFile(null);
                  setFileError(null);
                  setParsedTransactions([]);
                  setShowCsvPreview(false);
                }}
                className="p-2 rounded-md hover:bg-muted"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-6">
              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-2">Supported File Formats:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>PDF:</strong> Bank statements, transaction reports</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      Duplicates will be automatically skipped during import
                    </p>
                  </div>
                </div>
              </div>

              {/* File Input with Drag and Drop */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Select File
                </label>
                <div
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                    }`}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {isDragging ? 'Drop file here' : 'Drag and drop your file here, or click to browse'}
                  </p>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleMultiFormatFileSelect}
                    className="hidden"
                    id="file-upload-transactions"
                  />
                  <label htmlFor="file-upload-transactions" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 transition-colors">
                    Choose File
                  </label>
                </div>
                {selectedFile && (
                  <p className="text-sm text-success mt-2">
                    Selected: {selectedFile.name}
                  </p>
                )}

                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-medium mb-1">Parse Debug</div>
                    <pre className="text-xs overflow-auto max-h-64 bg-muted/40 p-2 rounded">
                      {JSON.stringify(parseDebug ?? { message: 'No parse data yet. Select a PDF and click Parse.' }, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-medium mb-1">Import Debug</div>
                    <pre className="text-xs overflow-auto max-h-64 bg-muted/40 p-2 rounded">
                      {JSON.stringify(importDebug ?? { message: 'No import yet. After parsing, click Import to see details.' }, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {fileError && (
                <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    <span className="text-destructive text-sm">{fileError}</span>
                  </div>
                </div>
              )}

              {/* Bank selector and Parse Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    Bank (optional)
                  </label>
                  <Combobox
                    options={[
                      { value: '', label: 'Auto-detect' },
                      { value: 'sbi', label: 'SBI' },
                      { value: 'hdfc', label: 'HDFC' },
                      { value: 'icici', label: 'ICICI' },
                      { value: 'axis', label: 'Axis' },
                      { value: 'bob', label: 'Bank of Baroda' },
                      { value: 'kotak', label: 'Kotak' },
                      { value: 'yes', label: 'YES Bank' }
                    ]}
                    value={selectedBank}
                    onValueChange={(value) => setSelectedBank(value || '')}
                    placeholder="Auto-detect"
                    searchPlaceholder="Search banks..."
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleParseFile();
                    }}
                    disabled={!selectedFile || isParsingFile}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isParsingFile ? (
                      <div className="flex items-center">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Parsing File...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Parse File
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Parse Progress */}
              {isParsingFile && parseProgress > 0 && (
                <div className="space-y-2">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${parseProgress}%` }}></div>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">Parsing... {parseProgress}%</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview Dialog */}
      {showCsvPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => {
          setShowCsvPreview(false);
          setParsedTransactions([]);
        }}>
          <div className="bg-card rounded-lg border shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 md:p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">Review Parsed Transactions</h3>
              <button
                onClick={() => {
                  setShowCsvPreview(false);
                  setParsedTransactions([]);
                }}
                className="p-2 rounded-md hover:bg-muted"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 md:p-6 space-y-6">
              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-5 h-5 text-success flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Found {filteredParsed.length} transactions</p>
                    <p className="text-sm text-muted-foreground">
                      Credits will be added as Income, Debits as Expenses.
                      Zero amounts will be skipped. Duplicates will be automatically skipped.
                      Store and product information will be preserved.
                    </p>
                  </div>
                </div>
                {isParsingFile && (
                  <div className="mt-3">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${parseProgress}%` }}></div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Parsing... {parseProgress}%</div>
                  </div>
                )}
              </div>

              {/* Credits & Debits Summary - Parser vs Actual */}
              {parsedTransactions.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-3 mb-4">
                    <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                    <h4 className="text-lg font-semibold text-foreground">Credits & Debits Summary</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Parser Found (from PDF metadata) */}
                    <div className="bg-background rounded-lg p-4 border border-border">
                      <div className="flex items-center space-x-2 mb-3">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h5 className="text-sm font-semibold text-foreground">Parser Found (from PDF)</h5>
                      </div>
                      <div className="space-y-2">
                        {statementMetadata?.totalCredits !== undefined ? (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Total Credits</p>
                            <p className="text-base font-bold text-green-600 dark:text-green-400">
                              ₹{Number(statementMetadata.totalCredits).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Total Credits</p>
                            <p className="text-sm text-muted-foreground">Not available in PDF</p>
                          </div>
                        )}
                        {statementMetadata?.totalDebits !== undefined ? (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Total Debits</p>
                            <p className="text-base font-bold text-red-600 dark:text-red-400">
                              ₹{Number(statementMetadata.totalDebits).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Total Debits</p>
                            <p className="text-sm text-muted-foreground">Not available in PDF</p>
                          </div>
                        )}
                        {statementMetadata?.transactionCount !== undefined && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Transaction Count</p>
                            <p className="text-sm font-semibold text-foreground">
                              {statementMetadata.transactionCount}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actual Parsed (calculated from transactions) */}
                    <div className="bg-background rounded-lg p-4 border border-border">
                      <div className="flex items-center space-x-2 mb-3">
                        <Check className="w-4 h-4 text-success" />
                        <h5 className="text-sm font-semibold text-foreground">Actual Parsed (from transactions)</h5>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Total Credits</p>
                          <p className="text-base font-bold text-green-600 dark:text-green-400">
                            ₹{actualTotals.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Total Debits</p>
                          <p className="text-base font-bold text-red-600 dark:text-red-400">
                            ₹{actualTotals.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Transaction Count</p>
                          <p className="text-sm font-semibold text-foreground">
                            {parsedTransactions.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Difference/Comparison */}
                  {(statementMetadata?.totalCredits !== undefined || statementMetadata?.totalDebits !== undefined) && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h5 className="text-sm font-semibold text-foreground mb-3">Comparison</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {statementMetadata?.totalCredits !== undefined && (
                          <div className="bg-muted/50 rounded p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Credit Difference</p>
                            <p className={`text-sm font-semibold ${Math.abs(actualTotals.totalCredits - Number(statementMetadata.totalCredits)) < 0.01
                              ? 'text-success'
                              : 'text-yellow-600 dark:text-yellow-400'
                              }`}>
                              {Math.abs(actualTotals.totalCredits - Number(statementMetadata.totalCredits)) < 0.01
                                ? '✓ Matches'
                                : `₹${Math.abs(actualTotals.totalCredits - Number(statementMetadata.totalCredits)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${actualTotals.totalCredits > Number(statementMetadata.totalCredits) ? 'more' : 'less'}`
                              }
                            </p>
                          </div>
                        )}
                        {statementMetadata?.totalDebits !== undefined && (
                          <div className="bg-muted/50 rounded p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Debit Difference</p>
                            <p className={`text-sm font-semibold ${Math.abs(actualTotals.totalDebits - Number(statementMetadata.totalDebits)) < 0.01
                              ? 'text-success'
                              : 'text-yellow-600 dark:text-yellow-400'
                              }`}>
                              {Math.abs(actualTotals.totalDebits - Number(statementMetadata.totalDebits)) < 0.01
                                ? '✓ Matches'
                                : `₹${Math.abs(actualTotals.totalDebits - Number(statementMetadata.totalDebits)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${actualTotals.totalDebits > Number(statementMetadata.totalDebits) ? 'more' : 'less'}`
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Account Details from PDF */}
              {statementMetadata && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-3 mb-4">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <h4 className="text-lg font-semibold text-foreground">Account Details from PDF</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {statementMetadata.accountNumber && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Account Number</p>
                        <p className="text-sm font-mono text-foreground bg-background px-2 py-1 rounded border">
                          {statementMetadata.accountNumber}
                        </p>
                      </div>
                    )}
                    {statementMetadata.ifsc && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">IFSC Code</p>
                        <p className="text-sm font-mono text-foreground bg-background px-2 py-1 rounded border">
                          {statementMetadata.ifsc}
                        </p>
                      </div>
                    )}
                    {statementMetadata.branch && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Branch</p>
                        <p className="text-sm text-foreground bg-background px-2 py-1 rounded border">
                          {statementMetadata.branch}
                        </p>
                      </div>
                    )}
                    {statementMetadata.accountHolderName && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Account Holder</p>
                        <p className="text-sm text-foreground bg-background px-2 py-1 rounded border">
                          {statementMetadata.accountHolderName}
                        </p>
                      </div>
                    )}
                    {statementMetadata.openingBalance !== null && statementMetadata.openingBalance !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Opening Balance</p>
                        <p className="text-sm font-semibold text-foreground bg-background px-2 py-1 rounded border">
                          ₹{Number(statementMetadata.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                    {statementMetadata.closingBalance !== null && statementMetadata.closingBalance !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Closing Balance</p>
                        <p className="text-sm font-semibold text-foreground bg-background px-2 py-1 rounded border">
                          ₹{Number(statementMetadata.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                    {statementMetadata.statementStartDate && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Statement Period (Start)</p>
                        <p className="text-sm text-foreground bg-background px-2 py-1 rounded border">
                          {new Date(statementMetadata.statementStartDate).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                    {statementMetadata.statementEndDate && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Statement Period (End)</p>
                        <p className="text-sm text-foreground bg-background px-2 py-1 rounded border">
                          {new Date(statementMetadata.statementEndDate).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                    {statementMetadata.totalCredits !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Total Credits</p>
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400 bg-background px-2 py-1 rounded border">
                          ₹{Number(statementMetadata.totalCredits).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                    {statementMetadata.totalDebits !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Total Debits</p>
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400 bg-background px-2 py-1 rounded border">
                          ₹{Number(statementMetadata.totalDebits).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                    {statementMetadata.transactionCount !== undefined && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Transaction Count</p>
                        <p className="text-sm font-semibold text-foreground bg-background px-2 py-1 rounded border">
                          {statementMetadata.transactionCount}
                        </p>
                      </div>
                    )}
                  </div>
                  {(!statementMetadata.accountNumber && !statementMetadata.ifsc && !statementMetadata.branch && !statementMetadata.accountHolderName) && (
                    <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        ⚠️ Account details could not be extracted from this PDF. The transactions will still be imported.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Split View: Raw Data (Left) and Processed Data (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Half - Raw Data */}
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Raw Transaction Data
                  </h4>
                  <div className="max-h-96 overflow-y-auto border border-border rounded-lg">
                    <div className="bg-muted px-4 py-2 border-b border-border sticky top-0">
                      <p className="text-sm font-medium text-foreground">
                        {filteredParsed.length} transactions found
                      </p>
                    </div>
                    <div className="space-y-2 p-4">
                      {visibleParsed.map((transaction: BankTransaction, index: number) => (
                        <div key={index} className="bg-card p-3 rounded border border-border">
                          <div className="text-xs text-muted-foreground mb-1">
                            Transaction #{index + 1} (Raw Length: {(transaction.raw || transaction.description || '').length})
                          </div>
                          <div className="text-sm font-mono text-foreground break-all whitespace-pre-wrap overflow-x-auto">
                            {transaction.raw || transaction.description || 'No raw data available'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Length: {(transaction.raw || transaction.description || '').length} chars
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Half - Processed Data */}
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Processed Data
                  </h4>
                  <div className="max-h-96 overflow-y-auto">
                    {/* Preview filters */}
                    <div className="flex items-center justify-between mb-3">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={previewMonthOnly} onChange={(e) => { setPreviewMonthOnly(e.target.checked); setPreviewPage(1); }} />
                        Current month only
                      </label>
                      <div className="flex items-center gap-2 text-xs">
                        <span>Rows per page</span>
                        <select value={previewPageSize} onChange={(e) => { setPreviewPageSize(parseInt(e.target.value || '200')); setPreviewPage(1); }} className="border rounded px-1 py-0.5 bg-background text-foreground">
                          <option value={100}>100</option>
                          <option value={200}>200</option>
                          <option value={500}>500</option>
                        </select>
                      </div>
                    </div>
                    {/* Table (md+) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full bg-card border border-border rounded-lg">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground uppercase tracking-wider">Date</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground uppercase tracking-wider">Store/Person</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground uppercase tracking-wider">Commodity</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground uppercase tracking-wider">Type</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground uppercase tracking-wider">Credit</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground uppercase tracking-wider">Debit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {visibleParsed.map((transaction: BankTransaction, index: number) => {
                            const debitAmount = parseFloat(String(transaction.debit || '0'));
                            const creditAmount = parseFloat(String(transaction.credit || '0'));
                            const isIncome = creditAmount > 0;
                            const storeOrPerson = transaction.store || transaction.personName || '';
                            const commodity = transaction.commodity || '';

                            return (
                              <tr key={index} className="hover:bg-muted/50">
                                <td className="px-3 py-2 text-xs text-foreground">
                                  {transaction.date_iso || transaction.date || new Date().toISOString().split('T')[0]}
                                </td>
                                <td className="px-3 py-2 text-xs text-foreground font-medium">
                                  {storeOrPerson || '-'}
                                </td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">
                                  {commodity || '-'}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${isIncome
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    }`}>
                                    {isIncome ? 'Credit' : 'Debit'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-xs font-bold text-green-600 dark:text-green-400">
                                  {creditAmount > 0 ? `₹${creditAmount.toFixed(2)}` : '-'}
                                </td>
                                <td className="px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400">
                                  {debitAmount > 0 ? `₹${debitAmount.toFixed(2)}` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card List */}
                    <div className="md:hidden divide-y divide-border border border-border rounded-lg overflow-hidden">
                      {visibleParsed.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">No records</div>
                      ) : (
                        visibleParsed.map((transaction: BankTransaction, index: number) => {
                          const debitAmount = parseFloat(String(transaction.debit || '0'));
                          const creditAmount = parseFloat(String(transaction.credit || '0'));
                          const isIncome = creditAmount > 0;
                          const storeOrPerson = transaction.store || transaction.personName || '';
                          const commodity = transaction.commodity || '';
                          return (
                            <div key={index} className="p-4 bg-card">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="text-xs text-muted-foreground">{transaction.date_iso || transaction.date || '-'}</div>
                                  <div className="text-sm font-medium text-foreground mt-1" title={transaction.description || transaction.narration || ''}>
                                    {transaction.description || transaction.narration || '—'}
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isIncome ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                      {isIncome ? 'Credit' : 'Debit'}
                                    </span>
                                    {storeOrPerson && (
                                      <span className="px-2 py-0.5 rounded text-xs bg-muted text-foreground">{storeOrPerson}</span>
                                    )}
                                    {commodity && (
                                      <span className="px-2 py-0.5 rounded text-xs bg-muted text-foreground">{commodity}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  {isIncome ? (
                                    <div className="text-sm font-semibold text-green-600 dark:text-green-400">₹{creditAmount.toFixed(2)}</div>
                                  ) : (
                                    <div className="text-sm font-semibold text-red-600 dark:text-red-400">₹{debitAmount.toFixed(2)}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-3 text-sm">
                        <span className="text-muted-foreground">Page {previewPage} of {totalPages}</span>
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 border rounded disabled:opacity-50 bg-background text-foreground hover:bg-muted" onClick={() => setPreviewPage(p => Math.max(1, p - 1))} disabled={previewPage === 1}>Prev</button>
                          <button className="px-2 py-1 border rounded disabled:opacity-50 bg-background text-foreground hover:bg-muted" onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))} disabled={previewPage === totalPages}>Next</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Import Button with progress */}
              <div className="space-y-3">
                {isImporting && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${importProgress}%` }}></div>
                  </div>
                )}
                <button
                  onClick={handleImportParsedTransactions}
                  disabled={isImporting}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                >
                  {isImporting ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Importing... {importProgress}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Transactions
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeletingTransaction(null);
        }}
        onConfirm={handleDelete}
        deleting={isDeleting}
        count={1}
        actionType="delete"
      />
    </div>
  );
}
