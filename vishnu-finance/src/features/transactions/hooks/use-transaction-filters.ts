'use client';

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, startOfMonth, subDays } from 'date-fns';
import type { TransactionCategory } from '@/types';
import type { ISODateRange } from '@/lib/date-range';
import { toLocalISODate } from '@/lib/date-range';
import { TRANSACTION_PAGE_SIZE } from '@/features/transactions/constants';
import type { QuickRange } from '../components/quick-range-chips';

export interface LineItemContext {
  label: string;
  planned: number;
  actual: number;
  remaining: number;
  status: string;
  monthLabel: string;
}

interface UseTransactionFiltersOptions {
  resolvedUserId: string | null;
  bootstrapRange?: ISODateRange;
  onLoadingChange?: (loading: boolean) => void;
}

export function useTransactionFilters({
  resolvedUserId,
  bootstrapRange,
  onLoadingChange,
}: UseTransactionFiltersOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const startDateParam = searchParams.get('startDate') || '';
  const endDateParam = searchParams.get('endDate') || '';
  const quickRangeParam = (searchParams.get('range') as QuickRange) || 'month';

  const [financialCategory, setFinancialCategory] = useState<TransactionCategory | 'ALL'>(
    (searchParams.get('type') as TransactionCategory | 'ALL') || 'ALL',
  );
  const [currentSearchTerm, setCurrentSearchTerm] = useState(searchParams.get('search') || '');
  const [amountPreset, setAmountPreset] = useState<
    'all' | 'lt1k' | '1to10k' | '10to50k' | '50to100k' | 'gt100k'
  >((searchParams.get('amountPreset') as 'all') || 'all');
  const [selectedCategoryId, setSelectedCategoryId] = useState(searchParams.get('categoryId') || '');
  const [quickRange, setQuickRange] = useState<QuickRange>(quickRangeParam);
  const [lineItemFilter, setLineItemFilter] = useState<string | null>(searchParams.get('lineItem'));
  const [lineItemContext, setLineItemContext] = useState<LineItemContext | null>(null);
  const [lineItemTxnIds, setLineItemTxnIds] = useState<Set<string> | null>(null);
  const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    const lineItem = searchParams.get('lineItem');
    setFinancialCategory((searchParams.get('type') as TransactionCategory | 'ALL') || 'ALL');
    if (lineItem) {
      setLineItemFilter(lineItem);
      setCurrentSearchTerm('');
      setLocalSearch('');
    } else {
      setLineItemFilter(null);
      setLineItemContext(null);
      setLineItemTxnIds(null);
      setCurrentSearchTerm(searchParams.get('search') || '');
    }
    setAmountPreset((searchParams.get('amountPreset') as typeof amountPreset) || 'all');
    setSelectedCategoryId(searchParams.get('categoryId') || '');
    setQuickRange((searchParams.get('range') as QuickRange) || 'month');
  }, [searchParams]);

  useEffect(() => {
    if (!lineItemFilter) {
      setLineItemContext(null);
      setLineItemTxnIds(null);
      return;
    }

    let cancelled = false;

    async function loadLineItemFilter() {
      if (!lineItemFilter) return;
      try {
        const res = await fetch(
          `/api/plan-adherence/line-item-transactions?label=${encodeURIComponent(lineItemFilter)}`,
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setLineItemContext({
          label: data.label,
          planned: data.planned,
          actual: data.actual,
          remaining: data.remaining,
          status: data.status,
          monthLabel: data.monthLabel,
        });
        setLineItemTxnIds(new Set(Array.isArray(data.transactionIds) ? data.transactionIds : []));
      } catch (error) {
        console.error('[transactions] line item filter failed', error);
      }
    }

    void loadLineItemFilter();
    return () => {
      cancelled = true;
    };
  }, [lineItemFilter]);

  const computeRange = useCallback(
    (range: QuickRange): [string, string] => {
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
          return ['2000-01-01', toLocalISODate(new Date(today.getFullYear(), today.getMonth() + 1, 0))];
        case 'custom':
        default:
          if (startDateParam && endDateParam) return [startDateParam, endDateParam];
          const now = new Date();
          return [
            toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
            toLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
          ];
      }
    },
    [startDateParam, endDateParam],
  );

  const [startDate, endDate] = useMemo(() => {
    if (startDateParam && endDateParam) return [startDateParam, endDateParam];
    if (bootstrapRange) return [bootstrapRange.startDate, bootstrapRange.endDate];
    return computeRange(quickRange);
  }, [startDateParam, endDateParam, quickRange, computeRange, bootstrapRange]);

  const daysInRange = useMemo(() => {
    if (!startDate || !endDate) return 30;
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      return Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    } catch {
      return 30;
    }
  }, [startDate, endDate]);

  const updateURLParams = useCallback(
    (updates: Record<string, string | null>) => {
      const requiresFetch = 'startDate' in updates || 'endDate' in updates || 'range' in updates;

      if (requiresFetch) {
        onLoadingChange?.(true);
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === '' || (key === 'page' && value === '1')) params.delete(key);
          else params.set(key, value);
        });
        router.push(`/transactions?${params.toString()}`);
        return;
      }

      startTransition(() => {
        if ('type' in updates) setFinancialCategory((updates.type as TransactionCategory | 'ALL') || 'ALL');
        if ('search' in updates) setCurrentSearchTerm(updates.search || '');
        if ('amountPreset' in updates)
          setAmountPreset((updates.amountPreset as typeof amountPreset) || 'all');
        if ('categoryId' in updates) setSelectedCategoryId(updates.categoryId || '');
      });

      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || (key === 'page' && value === '1')) params.delete(key);
        else params.set(key, value);
      });
      window.history.replaceState(null, '', `/transactions?${params.toString()}`);
    },
    [router, searchParams, onLoadingChange],
  );

  const applyDraftFilters = useCallback(
    (filters: {
      search?: string;
      categoryId?: string;
      type?: string;
      amountPreset?: string;
      range?: QuickRange;
      startDate?: string;
      endDate?: string;
    }) => {
      const updates: Record<string, string | null> = {
        search: filters.search || null,
        categoryId: filters.categoryId || null,
        type: filters.type === 'ALL' ? null : (filters.type ?? null),
        amountPreset: filters.amountPreset === 'all' ? null : (filters.amountPreset ?? null),
        page: '1',
      };
      if ((filters.range || 'month') !== (quickRangeParam || 'month')) updates.range = filters.range ?? null;
      if ((filters.startDate || '') !== (startDateParam || '')) updates.startDate = filters.startDate ?? null;
      if ((filters.endDate || '') !== (endDateParam || '')) updates.endDate = filters.endDate ?? null;
      updateURLParams(updates);
      setIsFilterOpen(false);
    },
    [updateURLParams, quickRangeParam, startDateParam, endDateParam],
  );

  const resetDraftFilters = useCallback(() => {
    updateURLParams({
      search: null,
      categoryId: null,
      type: null,
      amountPreset: null,
      range: 'month',
      startDate: null,
      endDate: null,
      page: '1',
    });
    setIsFilterOpen(false);
  }, [updateURLParams]);

  const handlePeriodChange = useCallback(
    (p: 'daily' | 'weekly' | 'monthly' | 'custom') => {
      setPeriod(p);
      if (!p || p === 'custom') return;
      const end = new Date();
      let start = new Date();
      if (p === 'daily' || p === 'monthly') start = startOfMonth(end);
      else if (p === 'weekly') start = subDays(end, 7);
      updateURLParams({
        range: 'custom',
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        page: '1',
      });
    },
    [updateURLParams],
  );

  const applyQuickRange = useCallback(
    (range: QuickRange) => {
      const [start, end] = computeRange(range);
      updateURLParams({ range, startDate: start, endDate: end, page: '1' });
    },
    [computeRange, updateURLParams],
  );

  const buildTransactionsRequest = useCallback(
    (page: number, options?: { includeTotals?: boolean; includeCount?: boolean }) => ({
      action: 'transactions_list' as const,
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
      sortField: 'transactionDate' as const,
      sortDirection: 'desc' as const,
    }),
    [
      startDate,
      endDate,
      quickRange,
      showDeleted,
      currentSearchTerm,
      selectedCategoryId,
      financialCategory,
      amountPreset,
    ],
  );

  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => updateURLParams({ search: value || null }), 500);
    };
  }, [updateURLParams]);

  const handleSearch = useCallback(
    (value: string) => {
      setLocalSearch(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  useEffect(() => {
    setLocalSearch(currentSearchTerm);
  }, [currentSearchTerm]);

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
      const categoryLabel = undefined; // resolved by caller with categories
      if (categoryLabel) filters.push(categoryLabel);
    }
    if (currentSearchTerm) filters.push(`Search: "${currentSearchTerm}"`);
    if (showDeleted) filters.push('Including deleted');
    return filters;
  }, [amountPreset, financialCategory, currentSearchTerm, selectedCategoryId, showDeleted]);

  return {
    isPending,
    startDateParam,
    endDateParam,
    startDate,
    endDate,
    daysInRange,
    financialCategory,
    currentSearchTerm,
    amountPreset,
    selectedCategoryId,
    quickRange,
    lineItemFilter,
    lineItemContext,
    lineItemTxnIds,
    localSearch,
    period,
    isFilterOpen,
    setIsFilterOpen,
    showDeleted,
    setShowDeleted,
    computeRange,
    updateURLParams,
    applyDraftFilters,
    resetDraftFilters,
    handlePeriodChange,
    applyQuickRange,
    buildTransactionsRequest,
    handleSearch,
    clearAllFilters,
    activeFilters,
  };
}
