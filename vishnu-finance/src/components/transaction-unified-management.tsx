'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, Filter, X, RefreshCw, CheckSquare, Square, Trash2, RotateCw, Tag, Layers, ChevronLeft, ChevronRight, Sparkles, Check, Calendar as CalendarIcon, FileText, Upload, AlertCircle, TrendingUp, ChevronDown, Edit, Download, ArrowUp, ShoppingCart, Utensils, Zap, ShoppingBag, BrainCircuit, Sun, Moon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useToast } from '../contexts/ToastContext';
import { Transaction, TransactionCategory } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from '@/contexts/ThemeContext';
import { format, startOfMonth, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Input } from './ui/input';
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
  const { theme, setTheme, isDark } = useTheme();

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
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selection state (always available, no separate mode)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkCategorize, setShowBulkCategorize] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  // Analytics is now permanent
  // Inline debug info

  const [showDeleted, setShowDeleted] = useState(false);
  const [showSelectionMode, setShowSelectionMode] = useState(false); // Toggle checkbox visibility
  const [isFilterOpen, setIsFilterOpen] = useState(false); // Advanced filter modal
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');


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
  const [remoteFile, setRemoteFile] = useState<string | null>(null);
  const [pdfPassword, setPdfPassword] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [categorizationProgress, setCategorizationProgress] = useState<{
    total: number;
    categorized: number;
    progress: number;
    isActive: boolean;
  } | null>(null);
  const [parsingViewMode, setParsingViewMode] = useState<'transactions' | 'raw' | 'json'>('transactions');

  const hasBootstrapTransactionsRef = useRef(Boolean(bootstrap?.transactions?.length));
  const hasBootstrapCategoriesRef = useRef(Boolean(bootstrap?.categories?.length));
  const filterBarRef = useRef<HTMLDivElement | null>(null);
  const selectionToolbarRef = useRef<HTMLDivElement | null>(null);
  const [filterPulse, setFilterPulse] = useState(false);
  const [selectionPulse, setSelectionPulse] = useState(false);

  // Filters from URL
  const startDateParam = searchParams.get('startDate') || '';
  const endDateParam = searchParams.get('endDate') || '';
  const quickRangeParam = (searchParams.get('range') as QuickRange) || 'month';
  const pageParam = parseInt(searchParams.get('page') || '1');

  // Filter State (Client-Side) - Initialized from URL, but managed locally
  const [financialCategory, setFinancialCategory] = useState<TransactionCategory | 'ALL'>((searchParams.get('type') as TransactionCategory | 'ALL') || 'ALL');
  const [currentSearchTerm, setCurrentSearchTerm] = useState(searchParams.get('search') || '');
  const [amountPreset, setAmountPreset] = useState<'all' | 'lt1k' | '1to10k' | '10to50k' | '50to100k' | 'gt100k'>((searchParams.get('amountPreset') as any) || 'all');
  const [selectedCategoryId, setSelectedCategoryId] = useState(searchParams.get('categoryId') || '');
  const [quickRange, setQuickRange] = useState<QuickRange>(quickRangeParam);

  // Draft Filter State for Deferred Application
  const [draftFilters, setDraftFilters] = useState({
    search: currentSearchTerm,
    categoryId: selectedCategoryId,
    type: financialCategory,
    amountPreset: amountPreset,
    range: quickRange,
    startDate: startDateParam,
    endDate: endDateParam,
  });

  // Sync draft filters when modal opens
  useEffect(() => {
    if (isFilterOpen) {
      setDraftFilters({
        search: currentSearchTerm,
        categoryId: selectedCategoryId,
        type: financialCategory,
        amountPreset: amountPreset,
        range: quickRange,
        startDate: startDateParam,
        endDate: endDateParam,
      });
    }
  }, [isFilterOpen, currentSearchTerm, selectedCategoryId, financialCategory, amountPreset, quickRange, startDateParam, endDateParam]);


  // Sync state if URL changes externally (e.g. back button)
  useEffect(() => {
    setFinancialCategory((searchParams.get('type') as TransactionCategory | 'ALL') || 'ALL');
    setCurrentSearchTerm(searchParams.get('search') || '');
    setAmountPreset((searchParams.get('amountPreset') as any) || 'all');
    setSelectedCategoryId(searchParams.get('categoryId') || '');
    setQuickRange((searchParams.get('range') as QuickRange) || 'month');
  }, [searchParams]);

  // Client-side pagination state
  const [visibleCount, setVisibleCount] = useState(50);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(50);
  }, [financialCategory, currentSearchTerm, amountPreset, selectedCategoryId]);


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
  const [localSearch, setLocalSearch] = useState(currentSearchTerm);
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [dateRangePickerOpen, setDateRangePickerOpen] = useState(false);

  // Update local dates when URL params change
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    if (!filterPulse) return;
    const timeout = window.setTimeout(() => setFilterPulse(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [filterPulse]);

  // Date range for calculations
  const daysInRange = useMemo(() => {
    if (!startDate || !endDate) return 30;
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    } catch (err) {
      return 30;
    }
  }, [startDate, endDate]);



  // Update URL params
  const updateURLParams = useCallback((updates: Record<string, string | null>) => {
    // Check if we need to fetch new data (Date Range changes)
    const requiresFetch = 'startDate' in updates || 'endDate' in updates || 'range' in updates;

    // If fetching, show loader and use router.push (server round trip for new data)
    if (requiresFetch) {
      if (resolvedUserId) {
        setIsLoading(true);
      }
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || (key === 'page' && value === '1')) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`/transactions?${params.toString()}`);
      return;
    }

    // Client-side filtering filtering - Update local state first
    if ('type' in updates) setFinancialCategory((updates.type as TransactionCategory | 'ALL') || 'ALL');
    if ('search' in updates) setCurrentSearchTerm(updates.search || '');
    if ('amountPreset' in updates) setAmountPreset((updates.amountPreset as any) || 'all');
    if ('categoryId' in updates) setSelectedCategoryId(updates.categoryId || '');

    // Client-side filtering only - use window.history to update URL without server hit
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || (key === 'page' && value === '1')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Update URL silently
    const newUrl = `/transactions?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [router, searchParams, resolvedUserId, setFinancialCategory, setCurrentSearchTerm, setAmountPreset, setSelectedCategoryId]);

  const applyDraftFilters = useCallback(() => {
    const updates: Record<string, string | null> = {
      search: draftFilters.search || null,
      categoryId: draftFilters.categoryId || null,
      type: draftFilters.type === 'ALL' ? null : draftFilters.type,
      amountPreset: draftFilters.amountPreset === 'all' ? null : draftFilters.amountPreset,
      page: '1'
    };

    // Only update date params if they actually changed
    // Use permissive comparison for null/empty string handling
    if ((draftFilters.range || 'month') !== (quickRangeParam || 'month')) {
      updates.range = draftFilters.range;
    }
    if ((draftFilters.startDate || '') !== (startDateParam || '')) {
      updates.startDate = draftFilters.startDate;
    }
    if ((draftFilters.endDate || '') !== (endDateParam || '')) {
      updates.endDate = draftFilters.endDate;
    }

    updateURLParams(updates);
    setIsFilterOpen(false);
  }, [draftFilters, updateURLParams, quickRangeParam, startDateParam, endDateParam]);

  const resetDraftFilters = useCallback(() => {
    setDraftFilters({
      search: '',
      categoryId: '',
      type: 'ALL',
      amountPreset: 'all',
      range: 'month',
      startDate: '',
      endDate: '',
    });
  }, []);

  /**
   * Period Synchronization: 
   * Instead of a useEffect that can cause infinite loops, we define a callback 
   * to handle period changes and update the URL explicitly.
   */
  const handlePeriodChange = useCallback((p: 'daily' | 'weekly' | 'monthly' | 'custom') => {
    setPeriod(p);
    if (!p || p === 'custom') return;

    // Calculate target dates based on period
    const end = new Date();
    let start = new Date();

    if (p === 'daily') {
      start = startOfMonth(end);
    } else if (p === 'weekly') {
      start = subDays(end, 7);
    } else if (p === 'monthly') {
      start = startOfMonth(end); // Current month start
    }

    const newStart = format(start, 'yyyy-MM-dd');
    const newEnd = format(end, 'yyyy-MM-dd');

    updateURLParams({
      range: 'custom',
      startDate: newStart,
      endDate: newEnd,
      page: '1'
    });
  }, [updateURLParams]);


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

  // Fetch transactions with pagination (Client-Side Filtering Strategy: Fetch ALL for the range)
  const fetchTransactions = useCallback(async ({ showSpinner = true }: { showSpinner?: boolean } = {}) => {
    if (!resolvedUserId) return;

    if (showSpinner) {
      setIsLoading(true);
    }
    try {
      let allTransactions: Transaction[] = [];
      let currentPage = 1;
      let hasMore = true;
      let fetchedTotals = null;
      let firstPagination = null;

      // Recursive fetch loop to get EVERYTHING
      while (hasMore) {
        const response = await fetch('/api/app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'transactions_list',
            page: currentPage,
            pageSize: 'all', // Request max (5000)
            includeTotals: currentPage === 1, // Only need totals once
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            includeDeleted: true,
            sortField: 'transactionDate',
            sortDirection: 'desc',
          }),
        });

        if (!response.ok) throw new Error('Failed to fetch transactions');

        const data = await response.json();
        const pageTransactions = data.transactions || [];

        // Add to accumulator
        allTransactions = [...allTransactions, ...pageTransactions];

        if (currentPage === 1) {
          fetchedTotals = data.totals;
          firstPagination = data.pagination;
        }

        // Check if we need to fetch more
        const totalRecords = data.pagination?.total || 0;
        const currentCount = allTransactions.length;

        // Safety break for extremely large datasets (e.g. > 50k) to prevent browser crash
        if (currentCount >= totalRecords || pageTransactions.length === 0 || currentCount > 50000) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      setTransactions(allTransactions);
      setPagination(firstPagination || { page: 1, pageSize: allTransactions.length, total: allTransactions.length, totalPages: 1 });
      setApiTotals(fetchedTotals ?? null);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showError('Error', 'Failed to load transactions');
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
    }
    // Dependencies only on DATE RANGE and User. Not on filters.
  }, [resolvedUserId, startDate, endDate, showDeleted, quickRange, showError]);

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

  // Update local search when URL state changes
  useEffect(() => {
    setLocalSearch(currentSearchTerm);
  }, [currentSearchTerm]);

  // Handle search with debounce
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateURLParams({ search: value || null });
      }, 500);
    };
  }, [updateURLParams]);

  const handleSearch = useCallback((value: string) => {
    setLocalSearch(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Use deferred value for the search term to keep the UI responsive during heavy filtering
  const deferredSearchTerm = React.useDeferredValue(currentSearchTerm);

  // Client-Side Filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 0. Deleted Filter
      if (t.isDeleted && !showDeleted) return false;
      if (!t.isDeleted && showDeleted) {
        // ...
      }
      if (!showDeleted && t.isDeleted) return false;

      // 1. Search (Description, Store, Person, Amount)
      if (deferredSearchTerm) { // Use deferredSearchTerm for expensive filtering
        const query = deferredSearchTerm.toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const store = (t.store || '').toLowerCase();
        const person = (t.personName || '').toLowerCase();
        const amt = (t.creditAmount || t.debitAmount || 0).toString();
        const notes = (t.notes || '').toLowerCase();

        if (!desc.includes(query) &&
          !store.includes(query) &&
          !person.includes(query) &&
          !amt.includes(query) &&
          !notes.includes(query)) {
          return false;
        }
      }

      // 2. Transaction Type
      if (financialCategory !== 'ALL' && t.financialCategory !== financialCategory) {
        return false;
      }

      // 3. Category
      if (selectedCategoryId && t.categoryId !== selectedCategoryId) {
        return false;
      }

      // 4. Amount Preset
      if (amountPreset !== 'all') {
        const val = t.creditAmount || t.debitAmount || 0;
        switch (amountPreset) {
          case 'lt1k': if (val >= 1000) return false; break;
          case '1to10k': if (val < 1000 || val >= 10000) return false; break;
          case '10to50k': if (val < 10000 || val >= 50000) return false; break;
          case '50to100k': if (val < 50000 || val >= 100000) return false; break;
          case 'gt100k': if (val < 100000) return false; break;
        }
      }

      return true;
    });
  }, [transactions, currentSearchTerm, financialCategory, selectedCategoryId, amountPreset, showDeleted]);

  // Performance Optimization: Combine totals and analytics calculations into a single pass
  const analytics = useMemo(() => {
    let income = 0;
    let expense = 0;
    const byCategory: Record<string, { income: number, expense: number }> = {};
    const catMap = new Map<string, number>();
    const progressMap = new Map<string, { amount: number, count: number }>();

    filteredTransactions.forEach(t => {
      const amount = t.creditAmount > 0 ? t.creditAmount : (t.debitAmount || 0);
      const isInc = t.financialCategory === 'INCOME';
      const catName = (t.category as any)?.name || 'Uncategorized';

      // Totals
      if (isInc) income += amount;
      else expense += amount;

      // By Category (for standard totals)
      if (!byCategory[catName]) byCategory[catName] = { income: 0, expense: 0 };
      if (isInc) byCategory[catName].income += amount;
      else byCategory[catName].expense += amount;

      // Sidebar Charts (specifically for Expenses)
      if (!isInc) {
        catMap.set(catName, (catMap.get(catName) || 0) + amount);
        const curr = progressMap.get(catName) || { amount: 0, count: 0 };
        progressMap.set(catName, { amount: curr.amount + amount, count: curr.count + 1 });
      }
    });

    const barChartData = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topCategories = Array.from(progressMap.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5);

    return {
      totals: { income, expense, byCategory },
      sidebar: { barChartData, topCategories }
    };
  }, [filteredTransactions]);

  const totals = analytics.totals;
  const sidebarAnalytics = analytics.sidebar;


  // Client-side pagination slice
  const visibleTransactions = useMemo(() => {
    return filteredTransactions.slice(0, visibleCount);
  }, [filteredTransactions, visibleCount]);

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
        tone: 'text-primary',
      },
      {
        key: 'expense',
        label: 'Spends',
        value: formatAmount(expense),
        helper: 'Outflow this range',
        tone: 'text-destructive',
      },
      {
        key: 'net',
        label: 'Net flow',
        value: formatAmount(net),
        helper: 'Income minus spends',
        tone: net >= 0 ? 'text-primary' : 'text-destructive',
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
    });
  }, [updateURLParams]);

  const openFilterSheet = useCallback(() => {
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
      setShowBulkDeleteDialog(false);
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
  const handleAutoCategorizeSelected = useCallback(async () => {
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

      // console.log(`🤖 Starting auto-categorization for ${selectedTransactions.length} transactions...`);

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
    if (currentSearchTerm) {
      filters.push(`Search: "${currentSearchTerm}"`);
    }
    if (showDeleted) {
      filters.push('Including deleted');
    }
    return filters;
  }, [amountPreset, categories, financialCategory, currentSearchTerm, selectedCategoryId, showDeleted]);

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
      const supportedTypes = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ];
      const supportedExtensions = ['.pdf', '.xls', '.xlsx', '.txt', '.csv'];

      const hasValidType = supportedTypes.includes(file.type);
      const hasValidExtension = supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (!hasValidType && !hasValidExtension) {
        setFileError('Please select a valid PDF, Excel, or Text file');
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
      const supportedTypes = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ];
      const supportedExtensions = ['.pdf', '.xls', '.xlsx', '.txt', '.csv'];

      const hasValidType = supportedTypes.includes(file.type);
      const hasValidExtension = supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (hasValidType || hasValidExtension) {
        setSelectedFile(file);
        setFileError(null);
        // Auto-parse the file after drop
        setTimeout(() => handleParseFile(file), 100);
      } else {
        setFileError('Please drop a valid PDF, Excel, or Text file');
      }
    }
  };

  // Parse file and extract transactions
  const handleParseFile = async (fileToParse?: File) => {
    const file = fileToParse || selectedFile;
    if (!file || !user?.id) return;

    let parseTimer: NodeJS.Timeout | null = null;
    try {
      setIsParsingFile(true);
      setParseProgress(10);
      setFileError(null);

      // Simulate parsing progress
      parseTimer = setInterval(() => {
        setParseProgress((p) => (p < 90 ? p + 2 : p));
      }, 300);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);
      if (selectedBank) formData.append('bankCode', selectedBank);
      if (pdfPassword) formData.append('password', pdfPassword);

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Special handling for password required - we'll keep the dialog open but show the input
          throw new Error('PASSWORD_REQUIRED');
        }
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to parse file');
      }

      const data = await response.json();
      const transactionsToSet = data.transactions || [];

      setParsedTransactions(transactionsToSet);
      setStatementMetadata(data.metadata || null);
      setTempFiles(data.tempFiles || []);
      setRemoteFile(data.remoteFile || null);
      setShowCsvPreview(true);
      setShowFileDialog(false);

      success('PDF Parsed', `Extracted ${data.count || transactionsToSet.length} transactions`);
      setParseProgress(100);
    } catch (error) {
      console.error('Error parsing file:', error);
      const msg = error instanceof Error ? error.message : 'Failed to parse file';
      if (msg === 'PASSWORD_REQUIRED') {
        setFileError('The PDF is password protected. Please enter the password below.');
        setShowFileDialog(true); // Ensure dialog stays open
      } else {
        setFileError(msg);
      }
    } finally {
      if (parseTimer) clearInterval(parseTimer);
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

    setImportProgress(10);
    console.log('📤 Sending import request with AI categorization and balance validation...');

    // Use bank statement import API which handles bank-specific fields
    // Note: type is optional, API will infer from credit/debit amounts
    const primaryTempFile = remoteFile || tempFiles[0];
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

    let importTimer: NodeJS.Timeout | null = null;
    try {
      // Simulate import progress up to 90% while waiting for server
      importTimer = setInterval(() => {
        setImportProgress((p) => (p < 90 ? Math.min(90, p + 4) : p));
      }, 300);

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
      }
    } catch (e) {
      console.error('Batch import error', e);
      setFileError(e instanceof Error ? e.message : 'Batch import failed');
      showError('Import failed', e instanceof Error ? e.message : 'Batch import failed');
    } finally {
      if (importTimer) clearInterval(importTimer);
      setIsImporting(false);
      setTimeout(() => setImportProgress(0), 1000);
    }
  };

  return (
    <div className="flex flex-col min-w-0 bg-background overflow-hidden h-full flex-1">
      {/* Mobile Header - Hidden on Desktop */}
      <div className="md:hidden">
        <MobileHeader
          title="Transactions"
          subtitle={`${pagination.total > 0 ? `${pagination.total.toLocaleString()} total` : `${filteredTransactions.length} shown`}`}
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSelectionMode(!showSelectionMode)}
                className={`p-2 rounded-md hover:bg-muted ${showSelectionMode ? 'bg-primary/10' : ''}`}
              >
                <CheckSquare className="w-5 h-5" />
              </button>
              <button onClick={openImportDialog} className="p-2 rounded-md hover:bg-muted">
                <FileText className="w-5 h-5" />
              </button>
              <button onClick={() => { setEditingTransaction(null); setShowForm(true); }} className="p-2 rounded-md hover:bg-muted">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          }
        />
        {categorizationProgress && categorizationProgress.isActive && (
          <div className="bg-primary/10 border-b border-primary/20 p-2">
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              <span className="flex-1 truncate">Categorizing... {categorizationProgress.progress}%</span>
            </div>
            <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${categorizationProgress.progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <header className="hidden md:flex h-20 border-b border-border items-center justify-between px-8 shrink-0 bg-background/50 backdrop-blur sticky top-0 z-30">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Transactions
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {totalRecords || 0} records found
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterOpen(true)}
            className={cn("gap-2 shadow-sm border-border bg-card/50", (financialCategory !== 'ALL' || selectedCategoryId || amountPreset !== 'all') && "bg-accent/50 border-primary/50 text-primary")}
          >
            <Filter className="w-4 h-4" />
            Advanced Filters
          </Button>
          <div className="h-4 w-[1px] bg-border mx-1 hidden lg:block"></div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSelectionMode(!showSelectionMode)}
            className={cn("gap-2 shadow-sm border-border bg-card/50", showSelectionMode && "bg-accent/50 border-primary/50")}
          >
            <CheckSquare className="w-4 h-4" />
            Selection mode
          </Button>
          <Button variant="outline" size="sm" onClick={openImportDialog} className="gap-2 shadow-sm border-border bg-card/50">
            <FileText className="w-4 h-4" />
            Open importer
          </Button>
          <div className="h-4 w-[1px] bg-border mx-1"></div>
          <Button size="sm" onClick={() => { setEditingTransaction(null); setShowForm(true); }} className="gap-2 font-bold bg-foreground text-background hover:bg-foreground/90 shadow-lg transition-all active:scale-95">
            <Plus className="w-4 h-4" />
            Add Transaction
          </Button>
        </div>
      </header>

      {/* Unified Main Layout with Optional Analytics */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border/50">

          {/* Top Filter Bar (Always Visible on Desktop) */}
          <div className="hidden md:flex p-6 py-4 items-center justify-between gap-4 border-b border-border/50 bg-card/10 backdrop-blur-sm">
            <div className="flex-1 max-w-xl">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 group-focus-within:text-foreground transition-colors" />
                <Input
                  type="text"
                  placeholder="Search transactions, merchants, categories..."
                  className="w-full bg-card/50 border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus-visible:ring-1 focus-visible:ring-foreground placeholder:text-muted-foreground/30 transition-all outline-none"
                  value={localSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-violet-500/10 to-purple-500/10 hover:from-violet-500/20 hover:to-purple-500/20 border-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-[10px] uppercase tracking-widest h-10 px-4 transition-all"
                onClick={async () => {
                  if (isBulkUpdating) return;
                  setIsBulkUpdating(true);
                  let totalRules = 0;
                  let totalAI = 0;

                  try {
                    success('Smart Categorization', 'Starting analysis (Hybrid Rules + AI)...');

                    let hasMore = true;
                    let safetyLimit = 100;
                    let consecutiveFiles = 0;

                    while (hasMore && safetyLimit > 0) {
                      try {
                        const res = await fetch('/api/app', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'transactions_auto_categorize' })
                        });

                        // Handle Rate Limiting (Status 429)
                        if (res.status === 429) {
                          success('Rate Limit', 'API Quota hit. Waiting 40s...');
                          await new Promise(r => setTimeout(r, 40000));
                          continue;
                        }

                        const text = await res.text();

                        // Check for error in text body (sometimes 500 returns json with error)
                        if (!res.ok) {
                          if (text.includes('429') || text.includes('quota') || text.includes('Too Many Requests')) {
                            success('Rate Limit', 'API Quota hit. Waiting 40s...');
                            await new Promise(r => setTimeout(r, 40000));
                            continue;
                          }
                          throw new Error('API Request Failed: ' + text);
                        }

                        const data = JSON.parse(text);

                        // Check for error in JSON property
                        if (data.error) {
                          if (JSON.stringify(data.error).includes('429') || JSON.stringify(data.error).includes('quota')) {
                            success('Rate Limit', 'API Quota hit. Waiting 40s...');
                            await new Promise(r => setTimeout(r, 40000));
                            continue;
                          }
                          // Warn but don't stop? Or stop?
                          // Removed console.error
                        }

                        const batchRules = data.rulesMatched || 0;
                        const batchAI = data.aiMatched || 0;
                        // const batchUpdated = data.updated || 0; // Removed commented out code

                        totalRules += batchRules;
                        totalAI += batchAI;

                        // Removed auto-pause logic as requested
                        /*
                        if (data.processed > 0 && batchUpdated === 0) {
                          consecutiveFiles++;
                        } else {
                          consecutiveFiles = 0;
                        }
                        */

                        success('Progress', `Updated: ${totalRules + totalAI} (Rules: ${totalRules}, AI: ${totalAI}). Remaining: ${data.remaining}`);

                        if (data.processed === 0 || (data.remaining === 0 && data.processed < 50)) {
                          hasMore = false;
                        }
                        // Removed auto-pause logic as requested
                        /* else if (consecutiveFiles >= 5) {
                          showError('Paused', 'Stopping loop: AI cannot categorize remaining items.');
                          hasMore = false;
                        } */

                      } catch (err: any) {
                        if (String(err).includes('quota') || String(err).includes('429')) {
                          success('Rate Limit', 'API Quota hit. Waiting 40s...');
                          await new Promise(r => setTimeout(r, 40000));
                          continue;
                        }
                        throw err;
                      }

                      // Small delay to be nice to API
                      await new Promise(r => setTimeout(r, 1500));
                      safetyLimit--;
                    }

                    success('Completed', `Finished! Total Updated: ${totalRules + totalAI} (Rules: ${totalRules}, AI: ${totalAI}).`);
                    fetchTransactions();
                  } catch (e) {
                    // Removed console.error
                    showError('Error', 'Auto-categorization process interrupted.');
                  } finally {
                    setIsBulkUpdating(false);
                  }
                }}
                disabled={isBulkUpdating}
              >
                <Sparkles size={14} className={cn(isBulkUpdating && "animate-spin")} />
                {isBulkUpdating ? 'Processing...' : 'Auto-Cat (Smart)'}
              </Button>
              <div className="flex items-center bg-card/50 border border-border rounded-lg p-1 shadow-sm">
                {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={cn(
                      "p-1.5 px-3 text-[10px] font-black uppercase tracking-widest rounded transition-all",
                      period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Popover open={dateRangePickerOpen} onOpenChange={setDateRangePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-card/50 border-border font-bold text-[10px] uppercase tracking-widest shadow-sm h-10 px-4">
                    <CalendarIcon size={14} />
                    {rangeLabel}
                    <ChevronDown size={12} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-2xl border-border" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={localStartDate ? new Date(localStartDate) : undefined}
                    selected={localStartDate && localEndDate ? { from: new Date(localStartDate), to: new Date(localEndDate) } : undefined}
                    onSelect={(range) => {
                      if (range?.from) {
                        const newStart = format(range.from, 'yyyy-MM-dd');
                        const newEnd = range.to ? format(range.to, 'yyyy-MM-dd') : '';
                        setPeriod('custom');
                        updateURLParams({
                          range: 'custom',
                          startDate: newStart,
                          endDate: newEnd,
                          page: '1'
                        });
                        if (range.to) setDateRangePickerOpen(false);
                      }
                    }}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 bg-background/50">
            {/* Overview Section - Always Visible */}
            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Financial Overview</h2>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-card/50 px-2 py-0.5">{rangeLabel}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {isLoading ? (
                    [1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                    ))
                  ) : (
                    <>
                      <div className="bg-card border border-border p-6 rounded-2xl hover:border-emerald-500/30 transition-all shadow-sm group">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 group-hover:text-emerald-500 transition-colors">Total Income</p>
                        <h3 className="text-2xl font-black text-emerald-500">{formatAmount(income)}</h3>
                        <p className="text-[10px] text-muted-foreground mt-1">Total inflow in this range</p>
                      </div>
                      <div className="bg-card border border-border p-6 rounded-2xl hover:border-foreground/30 transition-all shadow-sm group">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 group-hover:text-foreground transition-colors">Total Spends</p>
                        <h3 className="text-2xl font-black text-foreground">{formatAmount(expense)}</h3>
                        <p className="text-[10px] text-muted-foreground mt-1">Total outflow in this range</p>
                      </div>
                      <div className="bg-card border border-border p-6 rounded-2xl border-t-4 border-t-primary/20 hover:border-primary/50 transition-all shadow-sm group">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 group-hover:text-primary transition-colors">Net Flow</p>
                        <h3 className="text-2xl font-black text-foreground">{formatAmount(net)}</h3>
                        <p className="text-[10px] text-muted-foreground mt-1">Savings or deficit</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-4 mt-4 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                  <span className="bg-muted px-2 py-1 rounded-md">{count} records identified</span>
                  {rangeSummary && <span className="bg-muted px-2 py-1 rounded-md">{rangeSummary}</span>}
                </div>
              </section>
            </div>

            {/* Standardized Transaction Table */}
            <section className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {showSelectionMode && (
                        <th className="w-14 px-6 py-5">
                          <button
                            onClick={handleSelectAll}
                            className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                              selectedIds.size > 0 && selectedIds.size === filteredTransactions.length
                                ? "bg-foreground border-foreground text-background shadow-md"
                                : "bg-background border-input hover:border-foreground"
                            )}
                          >
                            {selectedIds.size > 0 && selectedIds.size === filteredTransactions.length && <Check className="w-3.5 h-3.5" />}
                            {selectedIds.size > 0 && selectedIds.size < filteredTransactions.length && <div className="w-2.5 h-0.5 bg-foreground" />}
                          </button>
                        </th>
                      )}
                      <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date</th>
                      <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Merchant / Description</th>
                      <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Category</th>
                      <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                      <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {isLoading && !transactions.length ? (
                      <tr>
                        <td colSpan={showSelectionMode ? 6 : 5} className="px-6 py-5">
                          <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div key={i} className="flex items-center justify-between gap-4">
                                <Skeleton className="h-12 w-12 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                  <Skeleton className="h-4 w-[30%]" />
                                  <Skeleton className="h-3 w-[20%]" />
                                </div>
                                <Skeleton className="h-8 w-24 rounded-lg" />
                                <Skeleton className="h-4 w-24" />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : filteredTransactions.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-16 text-center text-muted-foreground italic font-medium">No transactions found matching criteria.</td></tr>
                    ) : (
                      visibleTransactions.map(transaction => {
                        const isIncome = transaction.financialCategory === 'INCOME';
                        const isExpense = transaction.financialCategory === 'EXPENSE';
                        const amount = transaction.creditAmount || transaction.debitAmount || 0;
                        const isSelected = selectedIds.has(transaction.id);
                        const transactionDate = transaction.transactionDate ? new Date(transaction.transactionDate) : null;
                        const isValidDate = transactionDate && !isNaN(transactionDate.getTime());

                        return (
                          <tr
                            key={transaction.id}
                            onClick={() => {
                              if (showSelectionMode) toggleSelect(transaction.id);
                              else { setEditingTransaction(transaction); setShowForm(true); }
                            }}
                            className={cn(
                              "hover:bg-muted/30 transition-all cursor-pointer group border-l-4 border-l-transparent",
                              isSelected ? "bg-primary/5 border-l-primary hover:bg-primary/10" : "hover:border-l-primary/30"
                            )}
                          >
                            {showSelectionMode && (
                              <td className="px-6 py-5" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => toggleSelect(transaction.id)}
                                  className={cn(
                                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                    isSelected ? "bg-foreground border-foreground text-background shadow-md" : "bg-background border-input hover:border-foreground"
                                  )}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            )}
                            <td className="px-6 py-5 text-xs font-bold text-muted-foreground">
                              {isValidDate ? format(transactionDate, 'MMM dd, yyyy') : 'No Date'}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="size-9 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                  <CategoryIcon category={transaction.category?.name || ''} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-bold text-foreground truncate max-w-[280px] tracking-tight">{transaction.store || transaction.description}</span>
                                  {transaction.personName && <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5 truncate max-w-[320px] block">By {transaction.personName}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={cn(
                                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors",
                                isIncome ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"
                              )}>
                                {transaction.category?.name || 'General'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                                <div className={cn("size-2 rounded-full", transaction.accountStatementId ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-amber-500 shadow-[0_0_8_8px_rgba(245,158,11,0.2)]")}></div>
                                {transaction.accountStatementId ? 'Cleared' : 'Pending'}
                              </div>
                            </td>
                            <td className={cn(
                              "px-6 py-5 text-sm font-black text-right tracking-tight tabular-nums",
                              isIncome ? "text-emerald-500" : isExpense ? "text-rose-500" : "text-foreground"
                            )}>
                              {isIncome ? '+' : '-'}{formatAmount(amount)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Load More Button - Satisfies "overall data" request while preserving performance */}
              {visibleCount < filteredTransactions.length && (
                <div className="flex justify-center p-8 border-t border-border bg-muted/5">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(prev => prev + 100)}
                    className="gap-2 px-8 font-bold text-[10px] uppercase tracking-widest h-10 rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    Load more ({filteredTransactions.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </section>
          </div>
        </div>
        {/* Analytics Panel (Right Sidebar) - Permanent */}
        <aside className="w-80 lg:w-96 flex flex-col bg-card/30 border-l border-border overflow-y-auto custom-scrollbar shrink-0 hidden md:flex">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold tracking-tight">Analytics</h2>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-bold border-border bg-background" onClick={() => {
                // Basic export logic mockup
                const csv = transactions.map(t => `${t.transactionDate},${t.description},${t.debitAmount || 0},${t.creditAmount || 0}`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'transactions.csv';
                a.click();
              }}>
                <Download size={14} />
                Export
              </Button>
            </div>

            {/* Expenditure Chart Card */}
            <div className="bg-card border border-border p-6 rounded-2xl mb-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Expenditure Breakdown</p>
                <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center border border-emerald-500/20">
                  <ArrowUp size={12} className="mr-0.5" />
                  12%
                </div>
              </div>
              <div className="flex items-end gap-3 mb-2">
                <h3 className="text-3xl font-bold tracking-tighter">{formatAmount(expense)}</h3>
              </div>

              {/* Pie Chart Visual */}
              <div className="h-64 w-full relative">
                {sidebarAnalytics.barChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sidebarAnalytics.barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }}
                        tickFormatter={(val) => val.length > 6 ? val.slice(0, 6) : val}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                      />
                      <RechartsTooltip
                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                        formatter={(value: number) => [formatAmount(value), 'Spent']}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24}>
                        {sidebarAnalytics.barChartData.map((entry, index) => {
                          const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
                          return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* Radial Chart Visual */}
              <div className="relative flex justify-center py-4">
                <div className="relative size-48">
                  <svg className="size-full -rotate-90">
                    <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/20" />
                    <circle
                      cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="12"
                      className="text-foreground transition-all duration-1000 ease-in-out"
                      strokeDasharray={2 * Math.PI * 88}
                      strokeDashoffset={2 * Math.PI * 88 * (1 - Math.min(1, expense / (income || 1)))}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold mb-0.5">Avg / Day</p>
                    <p className="text-2xl font-black tracking-tight">{formatAmount(expense / daysInRange)}</p>
                  </div>
                </div>
              </div>

              {/* Category Progress */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Top Categories</h4>
                  <Button variant="link" className="h-auto p-0 text-[10px] font-bold text-foreground">View All</Button>
                </div>

                <div className="space-y-5">
                  {sidebarAnalytics.topCategories.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No expense data</p>
                  ) : (
                    sidebarAnalytics.topCategories.map(([name, stats], i) => {
                      const totalExp = totals.expense || 1;
                      const percent = Math.round((stats.amount / totalExp) * 100);
                      return (
                        <div key={i} className="group">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={cn("size-2 rounded-full", i === 0 ? "bg-foreground" : "bg-muted-foreground/40")}></div>
                              <span className="text-sm font-bold text-foreground capitalize">{name.toLowerCase()}</span>
                            </div>
                            <p className="text-xs font-bold">{formatAmount(stats.amount)}</p>
                          </div>
                          <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all duration-1000", i === 0 ? "bg-foreground" : "bg-muted-foreground/60")} style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Report CTA */}
            <div className="mt-10 p-5 rounded-2xl bg-foreground text-background shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-background/10 rounded-lg">
                  <FileText size={20} className="text-background" />
                </div>
                <div>
                  <p className="font-bold text-sm">Monthly Report</p>
                  <p className="text-[10px] text-background/60 mt-0.5">Your financial summary is ready for review.</p>
                </div>
              </div>
              <Button className="w-full bg-background text-foreground hover:bg-background/90 text-xs font-bold h-9">
                Generate Report
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Floating Action Button (Mobile) */}
      <div className="md:hidden">
        <FabButton
          icon={<Plus className="h-5 w-5" />}
          label="Add"
          onClick={() => { setEditingTransaction(null); setShowForm(true); }}
        />
      </div>

      {/* Advanced Filters Sheet */}
      <FilterSheet
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeFiltersCount={activeFilters.length}
        onClearFilters={clearAllFilters}
      >
        <div className="space-y-8 py-6">
          {/* Date Range Section */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Date Range</label>
            <QuickRangeChips
              value={draftFilters.range}
              onChange={(val) => {
                const range = computeRange(val);
                setDraftFilters(prev => ({
                  ...prev,
                  range: val,
                  startDate: range[0],
                  endDate: range[1] || ''
                }));
              }}
              className="gap-2"
            />

            <div className="pt-2">
              <Popover open={dateRangePickerOpen} onOpenChange={setDateRangePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-3 bg-muted/50 border-border font-bold text-xs h-12 px-4 rounded-xl">
                    <CalendarIcon size={16} className="text-muted-foreground" />
                    {rangeLabel}
                    <ChevronDown size={14} className="ml-auto text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-2xl border-border" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={draftFilters.startDate ? new Date(draftFilters.startDate) : undefined}
                    selected={
                      draftFilters.startDate
                        ? {
                          from: new Date(draftFilters.startDate),
                          to: draftFilters.endDate ? new Date(draftFilters.endDate) : undefined,
                        }
                        : undefined
                    }
                    onSelect={(range) => {
                      if (range?.from) {
                        const newStart = format(range.from, 'yyyy-MM-dd');
                        const newEnd = range.to ? format(range.to, 'yyyy-MM-dd') : '';
                        setDraftFilters(prev => ({
                          ...prev,
                          range: 'custom',
                          startDate: newStart,
                          endDate: newEnd
                        }));
                        if (range.to) setDateRangePickerOpen(false);
                      }
                    }}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Search Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Search</label>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 group-focus-within:text-foreground transition-colors" />
              <Input
                type="text"
                placeholder="Search description, store, UPI..."
                className="w-full bg-muted/50 border-border rounded-xl pl-10 pr-4 py-2 text-sm focus-visible:ring-1 focus-visible:ring-foreground transition-all outline-none"
                value={draftFilters.search}
                onChange={(e) => setDraftFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>

          {/* Category Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Category</label>
            <div className="relative">
              <select
                value={draftFilters.categoryId || ''}
                onChange={(e) => setDraftFilters(prev => ({ ...prev, categoryId: e.target.value }))}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm appearance-none focus:ring-1 focus:ring-ring transition-all text-foreground outline-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none w-4 h-4" />
            </div>
          </div>

          {/* Type Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Transaction Type</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDraftFilters(prev => ({ ...prev, type: 'ALL' }))}
                className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", (draftFilters.type === 'ALL' || !draftFilters.type) ? "bg-foreground text-background shadow-md" : "bg-muted/50 text-muted-foreground hover:bg-muted")}
              >
                All Types
              </button>
              {['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT'].map(t => (
                <button
                  key={t}
                  onClick={() => setDraftFilters(prev => ({ ...prev, type: t as any }))}
                  className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", draftFilters.type === t ? "bg-foreground text-background shadow-md" : "bg-muted/50 text-muted-foreground hover:bg-muted")}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Amount Range</label>
            <div className="flex flex-wrap gap-2">
              {[{ value: 'all', label: 'All' }, { value: 'lt1k', label: '<1k' }, { value: '1to10k', label: '1-10k' }, { value: '10to50k', label: '10-50k' }, { value: '50to100k', label: '50-100k' }, { value: 'gt100k', label: '>100k' }].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDraftFilters(prev => ({ ...prev, amountPreset: opt.value as any }))}
                  className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", (draftFilters.amountPreset === opt.value || (!draftFilters.amountPreset && opt.value === 'all')) ? "bg-foreground text-background shadow-md" : "bg-muted/50 text-muted-foreground hover:bg-muted")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t mt-4 flex gap-3">
          <Button variant="outline" className="flex-1 font-bold text-xs uppercase tracking-widest" onClick={resetDraftFilters}>
            Reset
          </Button>
          <Button className="flex-1 font-bold text-xs uppercase tracking-widest" onClick={applyDraftFilters}>
            Apply Filters
          </Button>
        </div>
      </FilterSheet>

      {/* Bulk Categorize Modal */}
      {
        showBulkCategorize && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => {
            setShowBulkCategorize(false);
            setBulkCategoryId('');
          }}>
            <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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
                  onClick={handleAutoCategorizeSelected}
                  disabled={isBulkUpdating}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Auto-categorize by UPI/Account Number
                </Button>
                <Button
                  variant="default"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0"
                  onClick={handleAutoCategorizeSelected}
                  disabled={isBulkUpdating}
                >
                  <BrainCircuit className="w-4 h-4 mr-2" />
                  Auto-Categorize Selected (AI)
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
            </div >
          </div >
        )
      }

      {/* FAB - Mobile */}
      {
        !showSelectionMode && (
          <FabButton
            icon={<Plus className="h-5 w-5" />}
            label="Add Transaction"
            onClick={() => {
              setEditingTransaction(null);
              setShowForm(true);
            }}
          />
        )
      }

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
      {
        showFileDialog && (
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
                        <li><strong>Excel:</strong> .xls, .xlsx transaction sheets</li>
                        <li><strong>Text:</strong> .txt, .csv flat files</li>
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
                      accept=".pdf,.xls,.xlsx,.txt,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
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

                {/* Password, Bank selector and Parse Button */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">
                      PDF Password (if any)
                    </label>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={pdfPassword}
                      onChange={(e) => setPdfPassword(e.target.value)}
                      className="bg-background"
                    />
                  </div>
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
        )
      }

      {/* CSV Preview Dialog */}
      {
        showCsvPreview && (
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

              <div className="flex border-b px-6 bg-muted/20">
                <button
                  onClick={() => setParsingViewMode('transactions')}
                  className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    parsingViewMode === 'transactions' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                >
                  Transactions
                </button>
                <button
                  onClick={() => setParsingViewMode('raw')}
                  className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    parsingViewMode === 'raw' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                >
                  Raw Extraction
                </button>
                <button
                  onClick={() => setParsingViewMode('json')}
                  className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    parsingViewMode === 'json' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                >
                  Processed JSON
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4 md:p-6 space-y-6">
                {parsingViewMode === 'transactions' && (
                  <>
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

                  </>
                )}

                {parsingViewMode === 'raw' && (
                  <div className="space-y-6">
                    <div className="bg-muted/50 rounded-lg p-6 border border-border">
                      <h4 className="text-lg font-semibold mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-primary" />
                        Stage 5-8: Raw Extraction Samples
                      </h4>
                      <div className="space-y-6">
                        <div>
                          <h5 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Sample Raw Rows (First 50)</h5>
                          <div className="bg-background border rounded-md p-4 max-h-[300px] overflow-y-auto font-mono text-xs whitespace-pre">
                            {statementMetadata?.raw_rows_sample?.map((row: string, i: number) => (
                              <div key={i} className="py-1 border-b border-muted last:border-0 hover:bg-muted/30 transition-colors">
                                <span className="text-muted-foreground mr-3 inline-block w-6">{i + 1}</span>
                                {row}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Identified Candidates (Top 100)</h5>
                          <div className="bg-background border rounded-md p-4 max-h-[300px] overflow-y-auto font-mono text-xs">
                            {statementMetadata?.raw_candidates?.map((can: any, i: number) => (
                              <div key={i} className="mb-4 pb-4 border-b border-muted last:border-0 last:pb-0">
                                <div className="font-bold text-primary mb-1">Candidate #{i + 1}</div>
                                <pre className="whitespace-pre-wrap">{JSON.stringify(can, null, 2)}</pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {parsingViewMode === 'json' && (
                  <div className="space-y-6">
                    <div className="bg-muted/50 rounded-lg p-6 border border-border">
                      <h4 className="text-lg font-semibold mb-4 flex items-center">
                        <BrainCircuit className="w-5 h-5 mr-2 text-primary" />
                        Final Processed Pipeline Output
                      </h4>
                      <div className="bg-background border rounded-md p-4 max-h-[500px] overflow-auto font-mono text-xs">
                        <pre>{JSON.stringify({
                          metadata: statementMetadata,
                          transactions: parsedTransactions,
                          debug_logs: (statementMetadata as any)?.debug_logs
                        }, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                )}

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
        )
      }

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div
          ref={selectionToolbarRef}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-8 duration-300"
        >
          <div className="bg-foreground text-background shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 border border-background/20 backdrop-blur-xl">
            <div className="flex items-center gap-3 pr-6 border-r border-background/20">
              <div className="size-8 rounded-full bg-background/10 flex items-center justify-center font-bold text-sm">
                {selectedIds.size}
              </div>
              <p className="text-sm font-bold tracking-tight">Selected</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-background/10 text-background font-bold text-[10px] uppercase tracking-widest h-9 px-4 gap-2"
                onClick={() => setShowBulkCategorize(true)}
              >
                <Tag size={14} />
                Categorize
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-rose-500/20 text-rose-400 font-bold text-[10px] uppercase tracking-widest h-9 px-4 gap-2"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 size={14} />
                Delete
              </Button>
            </div>

            <div className="pl-4">
              <button
                onClick={clearSelection}
                className="p-2 rounded-full hover:bg-background/10 transition-colors"
                title="Clear selection"
              >
                <X size={16} />
              </button>
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

      {/* Bulk Delete Confirmation */}
      <DeleteConfirmationDialog
        open={showBulkDeleteDialog}
        onClose={() => setShowBulkDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        deleting={isDeleting}
        count={selectedIds.size}
        actionType="delete"
      />
    </div >
  );
}

function CategoryIcon({ category }: { category: string }) {
  const cat = category.toLowerCase();
  if (cat.includes('tech') || cat.includes('apple') || cat.includes('electronic')) return <ShoppingCart className="size-4" />;
  if (cat.includes('food') || cat.includes('dine') || cat.includes('sushi')) return <Utensils className="size-4" />;
  if (cat.includes('utility') || cat.includes('bill') || cat.includes('con edison')) return <Zap className="size-4" />;
  return <ShoppingBag className="size-4" />;
}


