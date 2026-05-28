'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, Filter, X, RefreshCw, CheckSquare, Square, Trash2, RotateCw, Tag, Layers, ChevronLeft, ChevronRight, Sparkles, Check, Calendar as CalendarIcon, FileText, Upload, AlertCircle, TrendingUp, ChevronDown, Edit, Download, ArrowUp, ShoppingCart, Utensils, Zap, ShoppingBag, BrainCircuit, Sun, Moon, Link2, MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ChartContainer } from '@/components/ui/chart-container';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/contexts/ToastContext';
import { Transaction, TransactionCategory } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from '@/contexts/ThemeContext';
import { format, startOfMonth, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';
import TransactionCard from './transaction-card';
import TransactionFormModal, { TransactionFormData } from './transaction-form-modal';
import { SettlementLinkModal, type SettlementCandidate } from './settlement-link-modal';
import FilterSheet from './filter-sheet';
import QuickRangeChips, { QuickRange } from './quick-range-chips';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { Callout } from '@/components/ui/callout';
import { PageHero } from '@/components/ui/hero';
import { NavPill, NavPillGroup } from '@/components/ui/nav-pill';
import { patterns } from '@/design/patterns';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { calculateTotalsByCategory, formatCurrency } from '@/lib/transaction-utils';
import { cn } from '@/lib/utils';
import { getTransactionDisplayName } from '@/lib/transaction-utils';
import type { ISODateRange } from '@/lib/date-range';
import DeleteConfirmationDialog from './delete-confirmation-dialog';
import ParsedTransactionsReviewModal from './parsed-transactions-review-modal';
import SpendingCalendar, { type DailySpendEntry } from './spending-calendar';
import { TRANSACTION_PAGE_SIZE } from '@/features/transactions/constants';
import { toLocalISODate } from '@/lib/date-range';
import { MobileKpiStrip } from '@/components/ui/mobile-kpi-strip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const CHART_BAR_COLORS = [
  'var(--chart-credits)',
  'var(--category-needs)',
  'var(--category-wants)',
  'var(--category-emi)',
  'var(--category-invest)',
  'var(--hint)',
] as const;

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
  const [dailySpend, setDailySpend] = useState<DailySpendEntry[]>([]);
  const [isDailySpendLoading, setIsDailySpendLoading] = useState(false);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Array<{ name: string; expense: number; count: number }>>([]);
  const [isCategoryBreakdownLoading, setIsCategoryBreakdownLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [linkTransaction, setLinkTransaction] = useState<SettlementCandidate | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selection state (always available, no separate mode)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkCategorize, setShowBulkCategorize] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [applyToAllMatching, setApplyToAllMatching] = useState(false);

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
  const [mobilePanel, setMobilePanel] = useState<'list' | 'calendar' | 'breakdown'>('list');
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);


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
  const [autoCatCount, setAutoCatCount] = useState(0);
  const [parserMethod, setParserMethod] = useState<string>('primary');
  const [parseValidation, setParseValidation] = useState<{
    valid?: boolean;
    reconciled?: boolean;
    mismatch_count?: number;
    opening_balance?: number;
    closing_balance?: number;
  } | null>(null);
  const [allowImportDespiteValidation, setAllowImportDespiteValidation] = useState(false);

  const hasBootstrapTransactionsRef = useRef(Boolean(bootstrap?.transactions?.length));
  const hasBootstrapCategoriesRef = useRef(Boolean(bootstrap?.categories?.length));
  const filterBarRef = useRef<HTMLDivElement | null>(null);
  const selectionToolbarRef = useRef<HTMLDivElement | null>(null);
  const [filterPulse, setFilterPulse] = useState(false);
  const [selectionPulse, setSelectionPulse] = useState(false);
  const [isPending, startTransition] = React.useTransition();

  // AI OPTIMIZATION: Timer management to prevent resource leaks
  const activeTimersRef = useRef<Record<string, NodeJS.Timeout | number>>({});
  const isMountedRef = useRef(true);

  const cleanupTimer = useCallback((name: string) => {
    if (activeTimersRef.current[name]) {
      clearInterval(activeTimersRef.current[name] as any);
      clearTimeout(activeTimersRef.current[name] as any);
      delete activeTimersRef.current[name];
    }
  }, []);

  const registerTimer = useCallback((name: string, timer: NodeJS.Timeout | number) => {
    cleanupTimer(name);
    activeTimersRef.current[name] = timer;
  }, [cleanupTimer]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear all active timers on unmount
      Object.keys(activeTimersRef.current).forEach(cleanupTimer);
    };
  }, [cleanupTimer]);

  // Filters from URL
  const startDateParam = searchParams.get('startDate') || '';
  const endDateParam = searchParams.get('endDate') || '';
  const quickRangeParam = (searchParams.get('range') as QuickRange) || 'month';

  // Filter State (Client-Side) - Initialized from URL, but managed locally
  const [financialCategory, setFinancialCategory] = useState<TransactionCategory | 'ALL'>((searchParams.get('type') as TransactionCategory | 'ALL') || 'ALL');
  const [currentSearchTerm, setCurrentSearchTerm] = useState(searchParams.get('search') || '');
  const [amountPreset, setAmountPreset] = useState<'all' | 'lt1k' | '1to10k' | '10to50k' | '50to100k' | 'gt100k'>((searchParams.get('amountPreset') as any) || 'all');
  const [selectedCategoryId, setSelectedCategoryId] = useState(searchParams.get('categoryId') || '');
  const [quickRange, setQuickRange] = useState<QuickRange>(quickRangeParam);




  // Sync state if URL changes externally (e.g. back button)
  useEffect(() => {
    const lineItem = searchParams.get('lineItem');
    setFinancialCategory((searchParams.get('type') as TransactionCategory | 'ALL') || 'ALL');
    setCurrentSearchTerm(searchParams.get('search') || lineItem || '');
    setAmountPreset((searchParams.get('amountPreset') as any) || 'all');
    setSelectedCategoryId(searchParams.get('categoryId') || '');
    setQuickRange((searchParams.get('range') as QuickRange) || 'month');
  }, [searchParams]);

  const [loadedPage, setLoadedPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Compute date range from quick range
  const computeRange = useCallback((range: QuickRange): [string, string] => {
    const today = new Date();
    switch (range) {
      case 'month':
        return [
          toLocalISODate(new Date(today.getFullYear(), today.getMonth(), 1)),
          toLocalISODate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
        ];
      case 'lastMonth': {
        const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return [
          toLocalISODate(new Date(prev.getFullYear(), prev.getMonth(), 1)),
          toLocalISODate(new Date(prev.getFullYear(), prev.getMonth() + 1, 0)),
        ];
      }
      case 'quarter': {
        const q = Math.floor(today.getMonth() / 3);
        return [
          toLocalISODate(new Date(today.getFullYear(), q * 3, 1)),
          toLocalISODate(new Date(today.getFullYear(), (q + 1) * 3, 0)),
        ];
      }
      case 'year':
        return [
          toLocalISODate(new Date(today.getFullYear(), 0, 1)),
          toLocalISODate(new Date(today.getFullYear(), 11, 31)),
        ];
      case 'all':
        return [
          '2000-01-01',
          toLocalISODate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
        ];
      case 'custom':
      default:
        if (startDateParam && endDateParam) {
          return [startDateParam, endDateParam];
        }
        const now = new Date();
        return [
          toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
          toLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
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
    startTransition(() => {
      if ('type' in updates) setFinancialCategory((updates.type as TransactionCategory | 'ALL') || 'ALL');
      if ('search' in updates) setCurrentSearchTerm(updates.search || '');
      if ('amountPreset' in updates) setAmountPreset((updates.amountPreset as any) || 'all');
      if ('categoryId' in updates) setSelectedCategoryId(updates.categoryId || '');
    });

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
  }, [router, searchParams, resolvedUserId]);

  const applyDraftFilters = useCallback((filters: any) => {
    const updates: Record<string, string | null> = {
      search: filters.search || null,
      categoryId: filters.categoryId || null,
      type: filters.type === 'ALL' ? null : filters.type,
      amountPreset: filters.amountPreset === 'all' ? null : filters.amountPreset,
      page: '1'
    };

    // Only update date params if they actually changed
    // Use permissive comparison for null/empty string handling
    if ((filters.range || 'month') !== (quickRangeParam || 'month')) {
      updates.range = filters.range;
    }
    if ((filters.startDate || '') !== (startDateParam || '')) {
      updates.startDate = filters.startDate;
    }
    if ((filters.endDate || '') !== (endDateParam || '')) {
      updates.endDate = filters.endDate;
    }

    updateURLParams(updates);
    setIsFilterOpen(false);
  }, [updateURLParams, quickRangeParam, startDateParam, endDateParam]);

  const resetDraftFilters = useCallback(() => {
    updateURLParams({
      search: null,
      categoryId: null,
      type: null,
      amountPreset: null,
      range: 'month',
      startDate: null,
      endDate: null,
      page: '1'
    });
    setIsFilterOpen(false);
  }, [updateURLParams]);


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

  const buildTransactionsRequest = useCallback((page: number, options?: { includeTotals?: boolean; includeCount?: boolean }) => ({
    action: 'transactions_list',
    page,
    pageSize: TRANSACTION_PAGE_SIZE,
    includeTotals: options?.includeTotals ?? page === 1,
    includeCount: options?.includeCount ?? page === 1,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    range: quickRange,
    includeDeleted: showDeleted,
    search: currentSearchTerm || undefined,
    categoryId: selectedCategoryId || undefined,
    type: financialCategory !== 'ALL' ? financialCategory : undefined,
    amountPreset: amountPreset !== 'all' ? amountPreset : undefined,
    sortField: 'transactionDate',
    sortDirection: 'desc',
  }), [
    startDate,
    endDate,
    quickRange,
    showDeleted,
    currentSearchTerm,
    selectedCategoryId,
    financialCategory,
    amountPreset,
  ]);

  const fetchDailySpend = useCallback(async () => {
    if (!resolvedUserId) return;
    setIsDailySpendLoading(true);
    try {
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transactions_daily_spend',
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          range: quickRange,
        }),
      });
      if (!response.ok) throw new Error('Failed to fetch daily spend');
      const data = await response.json();
      setDailySpend(Array.isArray(data.daily) ? data.daily : []);
    } catch (error) {
      console.error('Error fetching daily spend:', error);
      setDailySpend([]);
    } finally {
      setIsDailySpendLoading(false);
    }
  }, [resolvedUserId, startDate, endDate, quickRange]);

  const fetchCategoryBreakdown = useCallback(async () => {
    if (!resolvedUserId) return;
    setIsCategoryBreakdownLoading(true);
    try {
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transactions_category_breakdown',
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          range: quickRange,
        }),
      });
      if (!response.ok) throw new Error('Failed to fetch category breakdown');
      const data = await response.json();
      setCategoryBreakdown(Array.isArray(data.categories) ? data.categories : []);
    } catch (error) {
      console.error('Error fetching category breakdown:', error);
      setCategoryBreakdown([]);
    } finally {
      setIsCategoryBreakdownLoading(false);
    }
  }, [resolvedUserId, startDate, endDate, quickRange]);

  const fetchTransactions = useCallback(async ({
    showSpinner = true,
    append = false,
    page = 1,
  }: { showSpinner?: boolean; append?: boolean; page?: number } = {}) => {
    if (!resolvedUserId) return;

    if (showSpinner) {
      setIsLoading(true);
    }
    try {
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTransactionsRequest(page)),
      });

      if (!response.ok) throw new Error('Failed to fetch transactions');

      const data = await response.json();
      const nextTransactions: Transaction[] = data.transactions || [];
      const nextPagination = data.pagination;
      const nextTotals = data.totals ?? null;

      if (append) {
        setTransactions((prev) => {
          const seen = new Set(prev.map((t) => t.id));
          const merged = [...prev];
          for (const row of nextTransactions) {
            if (!seen.has(row.id)) merged.push(row);
          }
          return merged;
        });
        setLoadedPage(page);
        if (nextPagination) {
          setPagination((prev) => ({
            ...prev,
            page: nextPagination.page ?? page,
            pageSize: nextPagination.pageSize ?? TRANSACTION_PAGE_SIZE,
            total: nextPagination.total ?? prev.total,
            totalPages: nextPagination.totalPages ?? prev.totalPages,
          }));
        }
      } else {
        setTransactions(nextTransactions);
        setLoadedPage(1);
        setPagination(nextPagination || {
          page: 1,
          pageSize: TRANSACTION_PAGE_SIZE,
          total: nextTransactions.length,
          totalPages: 1,
        });
        setApiTotals(nextTotals);
        void fetchDailySpend();
        void fetchCategoryBreakdown();
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showError('Error', 'Failed to load transactions');
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
    }
  }, [resolvedUserId, buildTransactionsRequest, showError, fetchDailySpend, fetchCategoryBreakdown]);

  const loadMoreTransactions = useCallback(async () => {
    if (isLoadingMore || isLoading) return;
    const total = pagination?.total ?? 0;
    if (transactions.length >= total) return;

    const nextPage = loadedPage + 1;
    setIsLoadingMore(true);
    try {
      await fetchTransactions({ showSpinner: false, append: true, page: nextPage });
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchTransactions, isLoadingMore, isLoading, pagination?.total, transactions.length, loadedPage]);

  const hasMoreToLoad = (pagination?.total ?? 0) > transactions.length;

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

  useEffect(() => {
    if (!resolvedUserId) return;
    fetchDailySpend();
    fetchCategoryBreakdown();
  }, [resolvedUserId, startDate, endDate, quickRange, fetchDailySpend, fetchCategoryBreakdown]);

  // Update local search when URL state changes
  useEffect(() => {
    setLocalSearch(currentSearchTerm);
  }, [currentSearchTerm]);

  useEffect(() => {
    const linkId = searchParams.get('link');
    if (!linkId || transactions.length === 0) return;
    const target = transactions.find((tx) => tx.id === linkId);
    if (!target) return;
    setLinkTransaction({
      id: target.id,
      description: target.description,
      personName: target.personName,
      store: target.store,
      creditAmount: Number(target.creditAmount) || 0,
      debitAmount: Number(target.debitAmount) || 0,
      financialCategory: target.financialCategory,
      transactionDate: target.transactionDate,
      categoryName: target.category?.name ?? null,
    });
    setShowLinkModal(true);
  }, [searchParams, transactions]);

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

  // Filters are applied server-side; client list mirrors fetched pages.
  const filteredTransactions = transactions;

  // Sidebar breakdown uses full-period API aggregates (not paginated rows).
  const sidebarAnalytics = useMemo(() => {
    const sorted = [...categoryBreakdown].sort((a, b) => b.expense - a.expense);
    const pinnedMatchers = ['uncategorized', 'miscellaneous', 'general', 'other'];
    const isPinned = (name: string) =>
      pinnedMatchers.some((label) => name.toLowerCase().includes(label));

    const merged = new Map<string, { name: string; expense: number; count: number }>();
    for (const entry of sorted) {
      merged.set(entry.name, entry);
    }
    for (const entry of sorted.filter((item) => isPinned(item.name))) {
      merged.set(entry.name, entry);
    }

    const allCategories = Array.from(merged.values()).sort((a, b) => b.expense - a.expense);

    const barChartData = (() => {
      const chartEntries = new Map<string, number>();
      for (const entry of sorted.slice(0, 8)) {
        chartEntries.set(entry.name, entry.expense);
      }
      for (const entry of allCategories.filter((item) => isPinned(item.name))) {
        chartEntries.set(entry.name, entry.expense);
      }
      return Array.from(chartEntries.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    })();

    const topCategories = allCategories.map(
      (entry) => [entry.name, { amount: entry.expense, count: entry.count }] as const,
    );

    return { barChartData, topCategories };
  }, [categoryBreakdown]);

  const formatAmount = useCallback(
    (value: number) => {
      const safeValue = Number.isFinite(value) ? value : 0;
      return formatCurrencyFunc ? formatCurrencyFunc(safeValue) : formatCurrency(safeValue);
    },
    [formatCurrencyFunc],
  );

  const overviewMetrics = useMemo(() => {
    const income = apiTotals?.income ?? 0;
    const expense = apiTotals?.expense ?? 0;
    return {
      income,
      expense,
      net: income - expense,
      count: pagination?.total ?? filteredTransactions.length,
    };
  }, [apiTotals, pagination?.total, filteredTransactions.length]);

  const { income, expense, net, count } = overviewMetrics;

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

  const handleGlobalAutoCategorize = useCallback(async () => {
    if (isBulkUpdating) return;
    setIsBulkUpdating(true);
    setAutoCatCount(0);
    setCategorizationProgress({ total: 100, categorized: 0, progress: 0, isActive: true });
    
    let totalUpdated = 0;
    let iterations = 0;
    const MAX_ITERATIONS = 50; // Safety cap (5000 trans max)

    try {
      while (iterations < MAX_ITERATIONS) {
        const response = await fetch('/api/app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'transactions_auto_categorize',
            userId: user?.id,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Auto-categorization failed' }));
          throw new Error(error.error || 'Auto-categorization failed');
        }

        const result = await response.json();
        
        if (result.updated > 0) {
          totalUpdated += result.updated;
          setAutoCatCount(totalUpdated);
          
          const totalRemaining = result.remaining || 0;
          const totalKnown = totalUpdated + totalRemaining;
          const progress = Math.min(99, Math.round((totalUpdated / (totalKnown || 1)) * 100));
          
          setCategorizationProgress({ 
            total: totalKnown, 
            categorized: totalUpdated, 
            progress, 
            isActive: true 
          });

          // Wait a bit to show progress and avoid slamming the API
          await new Promise(r => setTimeout(r, 600));
          
          if (totalRemaining === 0) break;
          iterations++;
        } else {
          break;
        }
      }

      if (totalUpdated > 0) {
        success('Auto-Categorization Complete', 
          `Successfully processed and updated ${totalUpdated} entries across the ledger.`
        );
        fetchTransactions();
      } else {
        showError('Info', 'No new categories could be automatically determined. Try labeling a few transactions manually first.');
      }
    } catch (error) {
      console.error('Error in global auto-categorization:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to run auto-categorization');
    } finally {
      setIsBulkUpdating(false);
      setCategorizationProgress(null);
    }
  }, [user, isBulkUpdating, fetchTransactions, success, showError, setCategorizationProgress]);

  const handleBulkCategorize = useCallback(async () => {
    if (selectedIds.size === 0 || !bulkCategoryId) {
      showError('Error', 'Please select transactions and a category');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const selectedTransactions = transactions.filter(t => selectedIds.has(t.id));
      
      let updates = Array.from(selectedIds).map(id => ({
        id,
        categoryId: bulkCategoryId,
      }));

      // Cascade Labeling: Find all other transactions that match the identities of the selected ones
      if (applyToAllMatching) {
        const identities = new Set<string>();
        selectedTransactions.forEach(t => {
          if (t.upiId) identities.add(`upi:${t.upiId}`);
          if (t.store) identities.add(`store:${t.store}`);
          if (t.personName) identities.add(`person:${t.personName}`);
        });

        if (identities.size > 0) {
          const matchingTransactions = transactions.filter(t => {
            if (selectedIds.has(t.id)) return false; // Already in updates
            if (t.isDeleted) return false;
            
            if (t.upiId && identities.has(`upi:${t.upiId}`)) return true;
            if (t.store && identities.has(`store:${t.store}`)) return true;
            if (t.personName && identities.has(`person:${t.personName}`)) return true;
            
            return false;
          });

          matchingTransactions.forEach(t => {
            updates.push({
              id: t.id,
              categoryId: bulkCategoryId,
            });
          });
        }
      }

      // Use the batch update endpoint
      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transactions_batch_update',
          userId: user?.id,
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transactions');
      }

      const result = await response.json();
      const successCount = result.succeeded || 0;
      
      success('Success', `Updated ${successCount} transaction(s) ${applyToAllMatching ? '(including matches)' : ''}`);
      setSelectedIds(new Set());
      setShowBulkCategorize(false);
      setBulkCategoryId('');
      setApplyToAllMatching(false);
      fetchTransactions();
    } catch (error) {
      console.error('Error categorizing transactions:', error);
      showError('Error', 'Failed to categorize transactions');
    } finally {
      setIsBulkUpdating(false);
    }
  }, [selectedIds, bulkCategoryId, transactions, applyToAllMatching, user, fetchTransactions, success, showError]);

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

  const formatPreviewDate = useCallback((transaction: BankTransaction) => {
    const raw = transaction.date_iso || transaction.date;
    if (!raw) return '—';
    const str = String(raw).slice(0, 10);
    try {
      return format(new Date(str), 'dd MMM yyyy');
    } catch {
      return str;
    }
  }, []);

  const getPreviewDescription = useCallback((transaction: BankTransaction) => {
    return String(transaction.description || transaction.narration || '').trim() || '—';
  }, []);

  const toIsoDate = useCallback((value: unknown): string | null => {
    if (!value) return null;
    const iso = new Date(String(value)).toISOString().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
  }, []);

  const resolveImportDateRange = useCallback((
    records: Array<{ date?: string; date_iso?: string }>,
    metadata: Record<string, unknown> | null,
    accountStatement?: { statementStartDate?: string; statementEndDate?: string } | null,
  ): [string, string] | null => {
    let start =
      toIsoDate(accountStatement?.statementStartDate)
      || toIsoDate(metadata?.statementStartDate);
    let end =
      toIsoDate(accountStatement?.statementEndDate)
      || toIsoDate(metadata?.statementEndDate);

    if (!start || !end) {
      const dates = records
        .map((record) => String(record.date_iso || record.date || '').slice(0, 10))
        .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
        .sort();

      if (dates.length === 0) return null;
      start = start || dates[0];
      end = end || dates[dates.length - 1];
    }

    if (start > end) return [end, start];
    return [start, end];
  }, [toIsoDate]);

  const importRangeOverlapsFilter = useCallback((
    importRange: [string, string],
    filterStart: string,
    filterEnd: string,
  ) => importRange[0] <= filterEnd && importRange[1] >= filterStart, []);

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

    try {
      setIsParsingFile(true);
      setParseProgress(10);
      setFileError(null);

      // Simulate parsing progress
      registerTimer('parseProgress', setInterval(() => {
        setParseProgress((p) => (p < 90 ? p + 2 : p));
      }, 300));

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

      if (!isMountedRef.current) return;

      setParsedTransactions(transactionsToSet);
      setStatementMetadata(data.metadata || null);
      setParserMethod(data.parserMethod || data.metadata?.parserMethod || 'primary');
      setParseValidation(data.metadata?.validation || null);
      setAllowImportDespiteValidation(false);
      setTempFiles(data.tempFiles || []);
      setRemoteFile(data.remoteFile || null);
      setShowCsvPreview(true);
      setShowFileDialog(false);

      success('PDF Parsed', `Extracted ${data.count || transactionsToSet.length} transactions`);
      setParseProgress(100);
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error parsing file:', error);
      const msg = error instanceof Error ? error.message : 'Failed to parse file';
      if (msg === 'PASSWORD_REQUIRED') {
        setFileError('The PDF is password protected. Please enter the password below.');
        setShowFileDialog(true); // Ensure dialog stays open
      } else {
        setFileError(msg);
      }
    } finally {
      cleanupTimer('parseProgress');
      if (isMountedRef.current) {
        setIsParsingFile(false);
        registerTimer('parseDone', setTimeout(() => setParseProgress(0), 1000));
      }
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
      if (!isMountedRef.current) return;
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

        if (response.ok && isMountedRef.current) {
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
            registerTimer('catDone', setTimeout(() => setCategorizationProgress(null), 3000));
            return;
          }

          // Continue polling if not complete
          if (attempts < maxAttempts) {
            attempts++;
            registerTimer('catPoll', setTimeout(poll, 5000)); // Poll every 5 seconds
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
      }
    };

    // Start polling after 2 seconds
    registerTimer('catPoll', setTimeout(poll, 2000));
  };

  const handleImportParsedTransactions = async () => {
    if (!parsedTransactions.length || !user?.id) return;

    const validationFailed = parseValidation && parseValidation.valid === false;
    if (validationFailed && !allowImportDespiteValidation) {
      setFileError('Balance reconciliation failed. Review the summary or check "Import anyway" to continue.');
      return;
    }

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
            autoCategorized: t.autoCategorized === true,
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
      forceInsert: allowImportDespiteValidation,
      updateExisting: true, // Refresh payee/store on duplicate transactions
      ...(documentMeta ? { document: documentMeta } : {}),
    };

    // Add metadata if available
    if (statementMetadata) {
      importPayload.metadata = statementMetadata;
    }

    try {
      // Simulate import progress up to 90% while waiting for server
      registerTimer('importProgress', setInterval(() => {
        setImportProgress((p) => (p < 90 ? Math.min(90, p + 4) : p));
      }, 300));

      const response = await fetch('/api/import-bank-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importPayload),
      });

      if (!isMountedRef.current) return;

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Batch import failed');
      }
      const result = await response.json();

      const incomeCount = result.incomeInserted || 0;
      const expenseCount = result.expenseInserted || 0;
      const totalInserted = result.inserted || 0;
      const totalUpdated = result.updatedExisting || 0;
      const totalProcessed = result.processed || (totalInserted + totalUpdated) || (incomeCount + expenseCount);

      let message = totalUpdated > 0
        ? `Updated ${totalUpdated} existing + inserted ${totalInserted} new (${incomeCount} income, ${expenseCount} expenses)`
        : `Inserted ${totalInserted} records (${incomeCount} income, ${expenseCount} expenses)`;
      if (result.duplicates) {
        message += `, ${result.duplicates} duplicates in file`;
      }

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

      // Display warnings (including opening-balance continuity notices)
      if (result.warnings && result.warnings.length > 0) {
        const warningMessages = result.warnings.slice(0, 3);
        message += `. Note: ${warningMessages.join(' ')}`;
        if (result.warnings.length > 3) {
          message += ` (+${result.warnings.length - 3} more)`;
        }
        warningMessages.forEach((warning: string) => {
          console.warn('Import warning:', warning);
        });
      }

      const importRange = resolveImportDateRange(
        normalized.filter((r): r is NonNullable<typeof r> => r !== null),
        statementMetadata,
        result.accountStatement,
      );

      const filterStart = startDate || '';
      const filterEnd = endDate || '';
      const shouldExpandDateFilter = Boolean(
        importRange
        && filterStart
        && filterEnd
        && !importRangeOverlapsFilter(importRange!, filterStart, filterEnd),
      );

      if (shouldExpandDateFilter && importRange) {
        message += `. Date filter set to ${importRange[0]} – ${importRange[1]}`;
      }

      success('Imported', message);
      setImportProgress(100);

      if (shouldExpandDateFilter && importRange) {
        updateURLParams({
          range: 'custom',
          startDate: importRange[0],
          endDate: importRange[1],
          page: '1',
        });
      } else {
        await fetchTransactions();
      }

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
            if (isMountedRef.current) setTempFiles(documentMeta ? [documentMeta.storageKey] : []);
          } catch (error) {
            console.warn('⚠️ Cleanup error, but import succeeded:', error);
          }
        }

        // Close preview dialog
        if (isMountedRef.current) {
          setShowCsvPreview(false);
          setParsedTransactions([]);
        }
      }
    } catch (e) {
      if (isMountedRef.current) {
        console.error('Batch import error', e);
        setFileError(e instanceof Error ? e.message : 'Batch import failed');
        showError('Import failed', e instanceof Error ? e.message : 'Batch import failed');
      }
    } finally {
      cleanupTimer('importProgress');
      if (isMountedRef.current) {
        setIsImporting(false);
        registerTimer('importDone', setTimeout(() => setImportProgress(0), 1000));
      }
    }
  };

  // AI OPTIMIZATION: Memoize filter props to prevent sheet re-renders
  const filterProps = useMemo(() => ({
    initialFilters: {
      search: currentSearchTerm,
      categoryId: selectedCategoryId,
      type: financialCategory,
      amountPreset: amountPreset,
      range: quickRange,
      startDate: startDateParam,
      endDate: endDateParam,
    },
    categories,
    onApply: applyDraftFilters,
    onReset: resetDraftFilters,
    computeRange,
  }), [currentSearchTerm, selectedCategoryId, financialCategory, amountPreset, quickRange, startDateParam, endDateParam, categories, applyDraftFilters, resetDraftFilters, computeRange]);

  return (
    <div className={cn(patterns.pageFluid, 'transactions-layout-root flex flex-col pb-8 lg:pb-4')}>

      <div className="mb-4 hidden shrink-0 flex-wrap items-center gap-2 md:flex">
        <div className="relative min-w-[160px] flex-1 basis-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
          <Input
            type="text"
            placeholder="Search transactions..."
            className="h-9 rounded-md border-border bg-card pl-9 text-sm"
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <NavPillGroup className="shrink-0">
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <NavPill key={p} label={p} active={period === p} onClick={() => handlePeriodChange(p)} />
          ))}
        </NavPillGroup>
        <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(true)}>
          <Filter className="mr-2 size-3.5" />
          Filters
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowSelectionMode(!showSelectionMode)}>
          <CheckSquare className="mr-2 size-3.5" />
          Select
        </Button>
        <Button variant="outline" size="sm" onClick={openImportDialog}>
          <FileText className="mr-2 size-3.5" />
          Import
        </Button>
        <Button variant="outline" size="sm" onClick={handleGlobalAutoCategorize} disabled={isBulkUpdating}>
          <Sparkles className={cn('mr-2 size-3.5', isBulkUpdating && 'animate-spin')} />
          Auto categorize
        </Button>
        <Button size="sm" onClick={() => { setEditingTransaction(null); setShowForm(true); }}>
          <Plus className="mr-2 size-3.5" />
          Add
        </Button>
      </div>

      {categorizationProgress && categorizationProgress.isActive && (
        <Callout variant="info" title="Categorizing transactions" className="mb-5">
          {categorizationProgress.progress}% complete
        </Callout>
      )}

      {/* Mobile search + quick actions */}
      <div className="mb-3 flex flex-col gap-2 md:hidden">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
            <Input
              type="text"
              placeholder="Search transactions..."
              className="h-9 rounded-md border-border bg-card pl-9 text-sm"
              value={localSearch}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="btn-touch shrink-0 px-2.5"
            onClick={() => setMobileToolsOpen(true)}
            aria-label="More actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
          <Button
            size="sm"
            className="btn-touch shrink-0 px-2.5"
            onClick={() => { setEditingTransaction(null); setShowForm(true); }}
            aria-label="Add transaction"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavPillGroup className="shrink-0">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <NavPill key={p} label={p} active={period === p} onClick={() => handlePeriodChange(p)} />
            ))}
          </NavPillGroup>
          <NavPillGroup className="shrink-0">
            {(
              [
                ['list', 'List'],
                ['calendar', 'Cal'],
                ['breakdown', 'Stats'],
              ] as const
            ).map(([panel, label]) => (
              <NavPill
                key={panel}
                label={label}
                active={mobilePanel === panel}
                onClick={() => setMobilePanel(panel)}
              />
            ))}
          </NavPillGroup>
        </div>
      </div>

      <Sheet open={mobileToolsOpen} onOpenChange={setMobileToolsOpen}>
        <SheetContent side="bottom" className={cn(patterns.bottomSheet, 'rounded-t-2xl p-4 md:hidden')}>
          <SheetHeader className="mb-3 text-left">
            <SheetTitle className="text-base">Actions</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11 justify-start gap-2" onClick={() => { setIsFilterOpen(true); setMobileToolsOpen(false); }}>
              <Filter className="size-4" /> Filters
            </Button>
            <Button variant="outline" className="h-11 justify-start gap-2" onClick={() => { setShowSelectionMode(!showSelectionMode); setMobileToolsOpen(false); }}>
              <CheckSquare className="size-4" /> Select
            </Button>
            <Button variant="outline" className="h-11 justify-start gap-2" onClick={() => { openImportDialog(); setMobileToolsOpen(false); }}>
              <FileText className="size-4" /> Import
            </Button>
            <Button variant="outline" className="h-11 justify-start gap-2" onClick={() => { handleGlobalAutoCategorize(); setMobileToolsOpen(false); }} disabled={isBulkUpdating}>
              <Sparkles className={cn('size-4', isBulkUpdating && 'animate-spin')} /> Auto categorize
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {!isLoading && (
        <MobileKpiStrip
          className="mb-3 shrink-0"
          items={[
            { label: 'Income', value: formatAmount(income), tone: 'success' },
            { label: 'Expenses', value: formatAmount(expense), tone: 'danger' },
            {
              label: 'Net',
              value: `${net > 0 ? '+' : ''}${formatAmount(net)}`,
              tone: net >= 0 ? 'success' : 'danger',
            },
          ]}
        />
      )}

      <div className={cn(patterns.cardGrid, 'mb-5 hidden shrink-0 md:grid lg:grid-cols-4')}>
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)
        ) : (
          <>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Income</p>
              <p className="mt-2 text-xl font-medium tabular-nums text-[var(--success)]">{formatAmount(income)}</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Expenses</p>
              <p className="mt-2 text-xl font-medium tabular-nums text-[var(--danger)]">{formatAmount(expense)}</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Net</p>
              <p className={cn('mt-2 text-xl font-medium tabular-nums', net >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
                {net > 0 ? '+' : ''}{formatAmount(net)}
              </p>
            </div>
            <div className="card-base hidden p-4 md:block">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Count</p>
              <p className="mt-2 text-xl font-medium tabular-nums text-foreground">{count}</p>
            </div>
          </>
        )}
      </div>

      <div className="transactions-layout-grid grid min-h-0 grid-cols-1 gap-4 lg:min-h-[28rem] lg:grid-cols-[minmax(0,1fr)_17.5rem] xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className={cn(
          'flex h-full min-h-0 min-w-0 flex-col overflow-hidden',
          mobilePanel !== 'list' && 'hidden md:flex'
        )}>
            <section className="card-base hidden h-full min-h-0 flex-col overflow-hidden md:flex">
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-border">
                    {showSelectionMode && (
                      <th className="w-8 px-2 py-2">
                        <button
                          onClick={handleSelectAll}
                          className={cn(
                            'flex size-3.5 items-center justify-center rounded border transition-all',
                            selectedIds.size > 0 && selectedIds.size === filteredTransactions.length
                              ? 'border-accent bg-accent text-[var(--primary-foreground)]'
                              : 'border-border bg-background hover:border-foreground'
                          )}
                        >
                          {selectedIds.size > 0 && selectedIds.size === filteredTransactions.length && <Check className="size-2.5" />}
                          {selectedIds.size > 0 && selectedIds.size < filteredTransactions.length && <div className="h-0.5 w-1.5 bg-foreground" />}
                        </button>
                      </th>
                    )}
                    <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Description</th>
                    <th className="w-28 px-3 py-2 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Category</th>
                    <th className="w-24 px-3 py-2 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-hint">Amount</th>
                    <th className="w-10 px-1 py-2" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                    {isLoading && !transactions.length ? (
                      <tr>
                        <td colSpan={showSelectionMode ? 4 : 3} className="px-4 py-4">
                          <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Skeleton key={i} className="h-9 w-full rounded-md" />
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : filteredTransactions.length === 0 ? (
                      <tr><td colSpan={showSelectionMode ? 4 : 3} className="px-4 py-16 text-center text-sm text-muted-foreground">No activity found for this period.</td></tr>
                    ) : (() => {
                      // Group transactions by date
                      const groups: { [date: string]: any[] } = {};
                      filteredTransactions.forEach(t => {
                        const d = t.transactionDate ? new Date(t.transactionDate).toISOString().split('T')[0] : 'undated';
                        if (!groups[d]) groups[d] = [];
                        groups[d].push(t);
                      });
                      const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

                      return sortedDates.map(dateKey => (
                        <React.Fragment key={dateKey}>
                          {/* Section Header */}
                          <tr className="bg-surface/80">
                            <td colSpan={showSelectionMode ? 5 : 4} className="px-3 py-1.5">
                              <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-hint">
                                {dateKey === 'undated' ? 'Undated' : format(new Date(dateKey), 'EEEE, d MMM yyyy')}
                              </span>
                            </td>
                          </tr>
                          {/* Transactions for this date */}
                          {groups[dateKey].map(transaction => (
                            <TransactionRow
                              key={transaction.id}
                              transaction={transaction}
                              isSelected={selectedIds.has(transaction.id)}
                              showSelectionMode={showSelectionMode}
                              toggleSelect={toggleSelect}
                              formatAmount={formatAmount}
                              onEdit={(t) => {
                                setEditingTransaction(t);
                                setShowForm(true);
                              }}
                              onLink={(t) => {
                                setLinkTransaction({
                                  id: t.id,
                                  description: t.description,
                                  personName: t.personName,
                                  store: t.store,
                                  creditAmount: Number(t.creditAmount) || 0,
                                  debitAmount: Number(t.debitAmount) || 0,
                                  financialCategory: t.financialCategory,
                                  transactionDate: t.transactionDate,
                                  categoryName: t.category?.name ?? null,
                                });
                                setShowLinkModal(true);
                              }}
                            />
                          ))}
                        </React.Fragment>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              {hasMoreToLoad && (
                <div className="shrink-0 border-t border-border bg-card px-3 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={loadMoreTransactions}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore
                      ? 'Loading…'
                      : `Load more (${(pagination?.total ?? 0) - transactions.length} remaining)`}
                  </Button>
                </div>
              )}
            </section>

            <div className="card-base mt-5 flex flex-col md:hidden md:mt-0">
              <div className="custom-scrollbar">
              {isLoading && !transactions.length ? (
                <div className="space-y-4 p-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-md" />
                  ))}
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted">No transactions found.</div>
              ) : (() => {
                const groups: { [date: string]: any[] } = {};
                filteredTransactions.forEach(t => {
                  const d = t.transactionDate ? new Date(t.transactionDate).toISOString().split('T')[0] : 'undated';
                  if (!groups[d]) groups[d] = [];
                  groups[d].push(t);
                });
                const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

                return sortedDates.map(dateKey => (
                  <div key={dateKey}>
                    <div className="border-b border-border bg-surface px-4 py-2">
                      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">
                        {dateKey === 'undated' ? 'Undated' : format(new Date(dateKey), 'EEEE, MMM d')}
                      </span>
                    </div>
                    {groups[dateKey].map(transaction => {
                      const isIncome = transaction.financialCategory === 'INCOME';
                      const isExpense = transaction.financialCategory === 'EXPENSE';
                      const amount = transaction.creditAmount || transaction.debitAmount || 0;
                      const isSelected = selectedIds.has(transaction.id);
                      const brand = (transaction as any).rawData?.brand;
                      const displayName = getTransactionDisplayName({
                        description: transaction.description,
                        store: transaction.store,
                        personName: transaction.personName,
                      });
                      const brandName: string | undefined =
                        brand?.name ||
                        (displayName !== transaction.description ? displayName : undefined) ||
                        transaction.store ||
                        transaction.personName ||
                        undefined;

                      return (
                        <MobileTransactionCard
                          key={transaction.id}
                          transaction={transaction}
                          isIncome={isIncome}
                          isExpense={isExpense}
                          amount={amount}
                          isSelected={isSelected}
                          brandName={brandName}
                          logoUrl={null}
                          showSelectionMode={showSelectionMode}
                          toggleSelect={toggleSelect}
                          formatAmount={formatAmount}
                          onPress={() => {
                            if (showSelectionMode) toggleSelect(transaction.id);
                            else { setEditingTransaction(transaction); setShowForm(true); }
                          }}
                        />
                      );
                    })}
                  </div>
                ));
              })()}
              </div>
              {hasMoreToLoad && (
                <div className="shrink-0 border-t border-border p-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={loadMoreTransactions}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore
                      ? 'Loading…'
                      : `Load more (${(pagination?.total ?? 0) - transactions.length} remaining)`}
                  </Button>
                </div>
              )}
            </div>
        </div>

        <aside className={cn(
          'card-base flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden',
          mobilePanel === 'list' ? 'hidden md:flex' : 'flex'
        )}>
          <div className={cn(mobilePanel === 'breakdown' && 'hidden md:block')}>
          <SpendingCalendar
            dailySpend={dailySpend}
            formatAmount={formatAmount}
            rangeEnd={endDate || startDate}
            isLoading={isDailySpendLoading}
          />
          </div>

          <div className={cn(
            'flex min-h-0 flex-1 flex-col overflow-hidden',
            mobilePanel === 'calendar' && 'hidden md:flex'
          )}>
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
            <div>
              <h2 className="text-xs font-medium text-foreground">Breakdown</h2>
              <p className="text-[10px] text-muted">Full period · all transactions</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => {
              const csv = transactions.map(t => `${t.transactionDate},${t.description},${t.debitAmount || 0},${t.creditAmount || 0}`).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'transactions.csv';
              a.click();
            }}>
              <Download className="mr-1 size-3" />
              Export
            </Button>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-border px-3 py-2 text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-hint">Expenses</p>
              <p className="font-medium tabular-nums text-[var(--danger)]">{formatAmount(expense)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-hint">Avg/day</p>
              <p className="font-medium tabular-nums text-foreground">{formatAmount(expense / daysInRange)}</p>
            </div>
          </div>

          {sidebarAnalytics.barChartData.length > 0 && (
            <div className="shrink-0 border-b border-border px-3 py-2">
              <ChartContainer height={88}>
                <BarChart data={sidebarAnalytics.barChartData} margin={{ top: 2, right: 2, left: -22, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 8 }} tickFormatter={(val) => val.length > 4 ? `${val.slice(0, 4)}…` : val} />
                  <YAxis hide />
                  <RechartsTooltip
                    formatter={(value: number) => [formatAmount(value), 'Spent']}
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]} barSize={12}>
                    {sidebarAnalytics.barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_BAR_COLORS[index % CHART_BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 custom-scrollbar">
            {isCategoryBreakdownLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-6 w-full rounded-md" />
                ))}
              </div>
            ) : sidebarAnalytics.topCategories.length === 0 ? (
              <p className="text-xs text-muted">No expense categories yet.</p>
            ) : (
              sidebarAnalytics.topCategories.map(([name, stats], i) => {
                const totalExp = expense || 1;
                const percent = Math.round((stats.amount / totalExp) * 100);
                return (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-foreground">{name}</span>
                      <span className="tabular-nums text-muted">{formatAmount(stats.amount)}</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-surface">
                      <div className="h-full bg-accent transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </div>
        </aside>
      </div>



      {/* Advanced Filters Sheet */}
      <FilterSheet
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeFiltersCount={activeFilters.length}
        onClearFilters={clearAllFilters}
      >
        <TransactionFilterContent {...filterProps} />
      </FilterSheet>

      {/* Bulk Categorize Modal */}
      {
        showBulkCategorize && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => {
            setShowBulkCategorize(false);
            setBulkCategoryId('');
          }}>
            <div className="bg-card rounded-none border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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
                        <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-2">
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
                                className={`p-3 rounded-none border text-left transition-all cursor-pointer ${bulkCategoryId === category.id
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
                        <h3 className="text-sm font-semibold text-danger mb-3 flex items-center gap-2">
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
                                className={`p-3 rounded-none border text-left transition-all cursor-pointer ${bulkCategoryId === category.id
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
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0"
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

      <SettlementLinkModal
        open={showLinkModal}
        onOpenChange={setShowLinkModal}
        sourceTransaction={linkTransaction}
        onLinked={() => {
          void fetchTransactions();
        }}
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
            <div className="bg-card rounded-none border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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

              <div className="p-4 md:p-6 space-y-6 overflow-y-auto">
                {/* Instructions */}
                <div className="bg-muted/50 rounded-none p-4 border border-border">
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
                    className={`border-2 border-dashed rounded-none p-8 text-center transition-colors ${isDragging
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
                  <div className="bg-destructive/10 border border-destructive rounded-none p-4">
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

      <ParsedTransactionsReviewModal
        open={showCsvPreview}
        onClose={() => {
          setShowCsvPreview(false);
          setParsedTransactions([]);
        }}
        fileName={selectedFile?.name}
        parsingViewMode={parsingViewMode}
        onParsingViewModeChange={setParsingViewMode}
        parsedTransactions={parsedTransactions}
        filteredParsed={filteredParsed}
        visibleParsed={visibleParsed}
        statementMetadata={statementMetadata}
        parserMethod={parserMethod}
        parseValidation={parseValidation}
        actualTotals={actualTotals}
        previewMonthOnly={previewMonthOnly}
        onPreviewMonthOnlyChange={setPreviewMonthOnly}
        previewPage={previewPage}
        onPreviewPageChange={setPreviewPage}
        previewPageSize={previewPageSize}
        onPreviewPageSizeChange={setPreviewPageSize}
        totalPages={totalPages}
        allowImportDespiteValidation={allowImportDespiteValidation}
        onAllowImportDespiteValidationChange={setAllowImportDespiteValidation}
        isImporting={isImporting}
        importProgress={importProgress}
        onImport={handleImportParsedTransactions}
        formatPreviewDate={formatPreviewDate}
        getPreviewDescription={getPreviewDescription}
      />

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div
          ref={selectionToolbarRef}
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-8 duration-300 w-[90%] md:w-auto"
        >
          <div className="bg-foreground text-background shadow-2xl rounded-none px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-3 md:gap-6 border border-border w-full md:w-auto">
            <div className="flex items-center gap-3 pr-3 md:pr-6 border-r border-background/20 shrink-0">
              <div className="size-8 rounded-full bg-background/10 flex items-center justify-center font-bold text-sm shrink-0">
                {selectedIds.size}
              </div>
              <p className="text-sm font-bold tracking-tight hidden md:block">Selected</p>
            </div>

            <div className="flex items-center gap-1 md:gap-2 flex-1 justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-background/10 text-background font-bold text-[10px] uppercase tracking-widest h-9 px-2 md:px-4 gap-1 md:gap-2 flex-1 md:flex-none"
                onClick={() => setShowBulkCategorize(true)}
              >
                <Tag size={14} className="shrink-0" />
                <span className="truncate">Categorize</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-[var(--danger-bg)] text-danger font-bold text-[10px] uppercase tracking-widest h-9 px-2 md:px-4 gap-1 md:gap-2 flex-1 md:flex-none"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 size={14} className="shrink-0" />
                <span className="truncate">Delete</span>
              </Button>
            </div>

            <div className="pl-2 md:pl-4 border-l border-background/20 md:border-none shrink-0">
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

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const cat = category.toLowerCase();
  if (cat.includes('tech') || cat.includes('apple') || cat.includes('electronic')) return <ShoppingCart className={className} />;
  if (cat.includes('food') || cat.includes('dine') || cat.includes('sushi')) return <Utensils className={className} />;
  if (cat.includes('utility') || cat.includes('bill') || cat.includes('con edison')) return <Zap className={className} />;
  return <ShoppingBag className={className} />;
}

// Domain map for Indian + global brands
const BRAND_DOMAINS: Record<string, string> = {
  'swiggy': 'swiggy.com',
  'zomato': 'zomato.com',
  'amazon': 'amazon.in',
  'amazon india': 'amazon.in',
  'flipkart': 'flipkart.com',
  'myntra': 'myntra.com',
  'ajio': 'ajio.com',
  'meesho': 'meesho.com',
  'nykaa': 'nykaa.com',
  'blinkit': 'blinkit.com',
  'zepto': 'zeptonow.com',
  'bigbasket': 'bigbasket.com',
  'dunzo': 'dunzo.com',
  'uber': 'uber.com',
  'ola': 'olacabs.com',
  'rapido': 'rapido.bike',
  'irctc': 'irctc.co.in',
  'makemytrip': 'makemytrip.com',
  'cleartrip': 'cleartrip.com',
  'netflix': 'netflix.com',
  'spotify': 'spotify.com',
  'hotstar': 'hotstar.com',
  'youtube': 'youtube.com',
  'google': 'google.com',
  'google pl': 'play.google.com',
  'jio': 'jio.com',
  'airtel': 'airtel.in',
  'phonepe': 'phonepe.com',
  'paytm': 'paytm.com',
  'gpay': 'pay.google.com',
  'cred': 'cred.club',
  'zerodha': 'zerodha.com',
  'groww': 'groww.in',
  'upstox': 'upstox.com',
  'bajaj': 'bajajfinserv.in',
  'bajaj finserv': 'bajajfinserv.in',
  'dmart': 'dmartindia.com',
  'starbucks': 'starbucks.in',
  'mcdonalds': 'mcdonalds.co.in',
  'kfc': 'kfc.co.in',
  'dominos': 'dominos.co.in',
  'pvr': 'pvrcinemas.com',
  'bookmyshow': 'bookmyshow.com',
  'tataplay': 'tataplay.com',
  'tata power': 'tatapower.com',
};

function resolveBrandDomain(name: string): string | null {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  if (BRAND_DOMAINS[key]) return BRAND_DOMAINS[key];
  for (const [brandKey, domain] of Object.entries(BRAND_DOMAINS)) {
    if (key.includes(brandKey)) return domain;
  }
  return null;
}

// 3-level fallback: Clearbit → Google Favicon → Colored Initials
function BrandLogo({ name, size = 44 }: { name: string | undefined; size?: number }) {
  const [stage, setStage] = React.useState(0); // 0=clearbit, 1=google, 2=initials
  const domain = name ? resolveBrandDomain(name) : null;

  const hue = name ? (name.charCodeAt(0) * 37 + name.charCodeAt(1 % name.length) * 13) % 360 : 200;
  const initials = name ? name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase() : '?';

  if (!domain || stage === 2) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ background: `hsl(${hue}, 55%, 90%)` }}
      >
        <span className="text-xs font-black" style={{ color: `hsl(${hue}, 55%, 28%)` }}>{initials}</span>
      </div>
    );
  }

  const src = stage === 0
    ? `https://logo.clearbit.com/${domain}`
    : `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="object-contain w-full h-full p-1"
      onError={() => setStage(s => s + 1)}
    />
  );
}



const MobileTransactionCard = React.memo(({
  transaction,
  isIncome,
  isExpense,
  amount,
  isSelected,
  brandName,
  logoUrl,
  showSelectionMode,
  toggleSelect,
  formatAmount,
  onPress,
}: {
  transaction: any;
  isIncome: boolean;
  isExpense: boolean;
  amount: number;
  isSelected: boolean;
  brandName: string | undefined;
  logoUrl: string | null;
  showSelectionMode: boolean;
  toggleSelect: (id: string) => void;
  formatAmount: (val: number) => string;
  onPress: () => void;
}) => {
  // BrandLogo component handles fallback chain internally

  return (
    <div
      onClick={onPress}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 transition-all active:bg-muted/30 md:hidden',
        isSelected && 'bg-primary/5 shadow-inner'
      )}
    >
      {showSelectionMode && (
        <div className="shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); toggleSelect(transaction.id); }}
            className={cn(
              'flex size-5 items-center justify-center rounded border transition-all',
              isSelected ? 'border-foreground bg-foreground text-background' : 'border-input bg-background'
            )}
          >
            {isSelected && <Check className="size-3" />}
          </button>
        </div>
      )}

      <div className="relative size-9 shrink-0">
        <div className="flex size-9 items-center justify-center overflow-hidden rounded-md border border-border/50 bg-card shadow-sm">
          {brandName ? (
            <BrandLogo name={brandName} size={36} />
          ) : (
            <div className="flex size-full items-center justify-center bg-muted/50">
              <CategoryIcon category={transaction.category?.name || ''} className="size-4" />
            </div>
          )}
        </div>
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-background',
            isIncome ? 'bg-[var(--success)]' : isExpense ? 'bg-[var(--danger)]' : 'bg-muted'
          )}
          aria-hidden
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="truncate text-sm font-medium text-foreground">
            {getTransactionDisplayName({
              description: transaction.description,
              store: transaction.store,
              personName: transaction.personName,
            })}
          </h4>
          <span
            className={cn(
              'shrink-0 text-sm font-semibold tabular-nums',
              isIncome ? 'text-[var(--success)]' : isExpense ? 'text-[var(--danger)]' : 'text-foreground'
            )}
          >
            {isIncome ? '+' : '-'}{formatAmount(amount)}
          </span>
        </div>
        <p className="truncate text-[10px] uppercase tracking-wide text-muted">
          {transaction.category?.name || 'General'}
        </p>
      </div>
    </div>
  );
});

const TransactionRow = React.memo(({
  transaction,

  isSelected,
  showSelectionMode,
  toggleSelect,
  formatAmount,
  onEdit,
  onLink,
}: {
  transaction: any;
  isSelected: boolean;
  showSelectionMode: boolean;
  toggleSelect: (id: string) => void;
  formatAmount: (val: number) => string;
  onEdit: (t: any) => void;
  onLink: (t: any) => void;
}) => {
  const isIncome = transaction.financialCategory === 'INCOME';
  const isExpense = transaction.financialCategory === 'EXPENSE';
  const amount = transaction.creditAmount || transaction.debitAmount || 0;
  // Resolve display name: rawData.brand → store → personName → description
  const brand = (transaction as any).rawData?.brand;
  const displayName = getTransactionDisplayName({
    description: transaction.description,
    store: transaction.store,
    personName: transaction.personName,
  });
  const brandName: string | undefined =
    brand?.name ||
    (displayName !== transaction.description ? displayName : undefined) ||
    transaction.store ||
    transaction.personName ||
    undefined;
  const subtitle = transaction.upiId
    || (displayName !== transaction.description ? transaction.description : null);

  return (
    <tr
      className={cn(
        "group border-b border-border transition-colors cursor-pointer",
        isSelected ? "bg-surface" : "hover:bg-surface/70"
      )}
      onClick={() => {
        if (showSelectionMode) toggleSelect(transaction.id);
        else onEdit(transaction);
      }}
    >
      {showSelectionMode && (
        <td className="w-8 px-2 py-1.5 border-r border-border/40">
          <button
            onClick={(e) => { e.stopPropagation(); toggleSelect(transaction.id); }}
            className={cn(
              "size-3.5 rounded border flex items-center justify-center transition-all",
              isSelected ? "bg-foreground border-foreground text-background" : "bg-background border-border"
            )}
          >
            {isSelected && <Check className="size-2.5" />}
          </button>
        </td>
      )}
      <td className="max-w-0 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-surface">
            {brandName ? (
              <BrandLogo name={brandName} size={28} />
            ) : (
              <CategoryIcon category={transaction.category?.name || ''} className="size-3 text-muted" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground" title={displayName}>
              {displayName}
            </p>
            {subtitle ? (
              <p className="truncate text-[10px] text-hint" title={subtitle}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="w-28 max-w-28 px-3 py-1.5">
          <Chip variant={isIncome ? 'success' : 'neutral'} className="block max-w-full truncate text-[10px] px-1.5 py-0">
            {transaction.category?.name || 'Uncategorized'}
          </Chip>
        </td>
      <td className={cn(
        "w-24 px-3 py-1.5 text-right text-xs font-medium tabular-nums whitespace-nowrap",
        isIncome ? "text-[var(--success)]" : isExpense ? "text-[var(--danger)]" : "text-foreground"
      )}>
        {isIncome ? '+' : '-'}{formatAmount(amount)}
      </td>
      <td className="w-10 px-1 py-1.5">
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-hint opacity-0 transition-opacity hover:bg-surface hover:text-foreground group-hover:opacity-100"
          title="Link settlement"
          onClick={(event) => {
            event.stopPropagation();
            onLink(transaction);
          }}
        >
          <Link2 className="size-3.5" />
        </button>
      </td>
    </tr>
  );
});

// Separate component for filter content to prevent main component re-renders
const TransactionFilterContent = React.memo(({
  initialFilters,
  categories,
  onApply,
  onReset,
  computeRange
}: {
  initialFilters: any;
  categories: any[];
  onApply: (filters: any) => void;
  onReset: () => void;
  computeRange: (range: any) => [string, string];
}) => {
  const [draft, setDraft] = useState(initialFilters);
  const [dateRangePickerOpen, setDateRangePickerOpen] = useState(false);

  // Range label localized for preview
  const rangeLabel = useMemo(() => {
    if (draft.range && draft.range !== 'custom') {
      const labels: Record<string, string> = {
        month: 'This month',
        lastMonth: 'Last month',
        quarter: 'This quarter',
        year: 'This year',
        all: 'All time',
      };
      return labels[draft.range] || 'Custom Range';
    }
    if (draft.startDate && draft.endDate) {
      return `${format(new Date(draft.startDate), 'd MMM')} - ${format(new Date(draft.endDate), 'd MMM yyyy')}`;
    }
    return 'Select Range';
  }, [draft.range, draft.startDate, draft.endDate]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Date range</label>
        <QuickRangeChips
          value={draft.range}
          onChange={(val) => {
            const range = computeRange(val);
            setDraft((prev: any) => ({
              ...prev,
              range: val,
              startDate: range[0],
              endDate: range[1] || ''
            }));
          }}
          className="gap-1.5"
        />
        <Popover open={dateRangePickerOpen} onOpenChange={setDateRangePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 w-full justify-start gap-2 text-xs">
              <CalendarIcon size={14} className="text-muted-foreground" />
              {rangeLabel}
              <ChevronDown size={14} className="ml-auto text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-border" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={draft.startDate ? new Date(draft.startDate) : undefined}
              selected={
                draft.startDate
                  ? {
                    from: new Date(draft.startDate),
                    to: draft.endDate ? new Date(draft.endDate) : undefined,
                  }
                  : undefined
              }
              onSelect={(range) => {
                if (range?.from) {
                  const newStart = format(range.from, 'yyyy-MM-dd');
                  const newEnd = range.to ? format(range.to, 'yyyy-MM-dd') : '';
                  setDraft((prev: any) => ({
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

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Description, store, UPI…"
            className="h-9 pl-9"
            value={draft.search}
            onChange={(e) => {
              const val = e.target.value;
              setDraft((prev: any) => ({ ...prev, search: val }));
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Category</label>
        <Select
          value={draft.categoryId || 'all'}
          onValueChange={(val) => {
            setDraft((prev: any) => ({ ...prev, categoryId: val === 'all' ? '' : val }));
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Transaction type</label>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant={(draft.type === 'ALL' || !draft.type) ? 'default' : 'ghost'}
            className="h-8 capitalize"
            onClick={() => setDraft((prev: any) => ({ ...prev, type: 'ALL' }))}
          >
            All
          </Button>
          {(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT'] as const).map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={draft.type === t ? 'default' : 'ghost'}
              className="h-8 capitalize"
              onClick={() => setDraft((prev: any) => ({ ...prev, type: t }))}
            >
              {t.toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Amount range</label>
        <div className="flex flex-wrap gap-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'lt1k', label: '<1k' },
            { value: '1to10k', label: '1–10k' },
            { value: '10to50k', label: '10–50k' },
            { value: '50to100k', label: '50–100k' },
            { value: 'gt100k', label: '>100k' },
          ].map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={(draft.amountPreset === opt.value || (!draft.amountPreset && opt.value === 'all')) ? 'default' : 'ghost'}
              className="h-8"
              onClick={() => setDraft((prev: any) => ({ ...prev, amountPreset: opt.value as any }))}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-t border-border pt-4">
        <Button variant="outline" className="flex-1" size="sm" onClick={() => onReset()}>
          Reset
        </Button>
        <Button className="flex-1" size="sm" onClick={() => onApply(draft)}>
          Apply filters
        </Button>
      </div>
    </div>
  );
});

TransactionFilterContent.displayName = 'TransactionFilterContent';


