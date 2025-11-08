'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Filter, X, RefreshCw, Settings, CheckSquare, Square, Trash2, RotateCw, Tag, Layers, ChevronLeft, ChevronRight, Sparkles, Check, Calendar as CalendarIcon, FileText, Upload, AlertCircle, TrendingUp } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
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
import { Combobox } from './ui/combobox';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { calculateTotalsByCategory, formatCurrency } from '@/lib/transaction-utils';
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

export default function TransactionUnifiedManagement() {
  const { user } = useAuth();
  const { formatCurrency: formatCurrencyFunc } = useCurrency();
  const { success, error: showError } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; type: 'INCOME' | 'EXPENSE'; color?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 50, totalPages: 0 });
  const [apiTotals, setApiTotals] = useState<{ income: number; expense: number } | null>(null);
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
    return computeRange(quickRange);
  }, [startDateParam, endDateParam, quickRange, computeRange]);

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

  // Update URL params
  const updateURLParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/transactions?${params.toString()}`);
  }, [router, searchParams]);

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
  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (financialCategory !== 'ALL') {
        params.set('type', financialCategory);
      }
      if (searchTerm) {
        params.set('search', searchTerm);
      }
      if (startDate) {
        params.set('startDate', startDate);
      }
      if (endDate) {
        params.set('endDate', endDate);
      }
      if (amountPreset && amountPreset !== 'all') {
        params.set('amountPreset', amountPreset);
      }
      if (selectedCategoryId) {
        params.set('categoryId', selectedCategoryId);
      }
      params.set('sortField', 'transactionDate');
      params.set('sortDirection', 'desc');
      params.set('page', pageParam.toString());
      params.set('pageSize', getPageSize());
      params.set('includeTotals', 'true'); // Always fetch totals
      if (showDeleted) {
        params.set('includeDeleted', 'true');
      }

      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');

      const data = await response.json();
      setTransactions(data.transactions || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
      if (data.totals) {
        setApiTotals(data.totals);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showError('Error', 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [user, financialCategory, searchTerm, startDate, endDate, showDeleted, pageParam, getPageSize, showError, amountPreset, selectedCategoryId]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [user]);

  // Effects
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Update local search when URL changes
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  // Handle search with debounce
  const handleSearch = useCallback((value: string) => {
    setLocalSearch(value);
    updateURLParams({ search: value || null, page: '1' }); // Reset to page 1 on search
  }, [updateURLParams]);

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

  // Handle save
  const handleSave = useCallback(async (data: TransactionFormData) => {
    try {
      const transactionId = editingTransaction?.id;
      const url = transactionId ? `/api/transactions/${transactionId}` : '/api/transactions';
      const method = transactionId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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
      const response = await fetch(`/api/transactions/${deletingTransaction.id}`, {
        method: 'DELETE',
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

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) {
      showError('Error', 'Please select transactions to delete');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/transactions/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds: Array.from(selectedIds) }),
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
      const response = await fetch('/api/transactions/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds: deletedSelected }),
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

  // Auto-categorize by UPI/Account Number
  const handleAutoCategorizeByUpiAccount = useCallback(async () => {
    if (selectedIds.size === 0) {
      showError('Error', 'Please select transactions to categorize');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const selectedTransactions = transactions.filter(t => selectedIds.has(t.id));
      
      // Fetch all transactions to find patterns (not just selected ones)
      // This helps find categories for UPI/account numbers that appear in other transactions
      const allTransactionsResponse = await fetch('/api/transactions?includeTotals=false');
      let allTransactions: Transaction[] = [];
      if (allTransactionsResponse.ok) {
        const data = await allTransactionsResponse.json();
        allTransactions = data.transactions || [];
      }

      // Use all transactions for pattern matching, but only apply to selected ones
      const categorySuggestions = new Map<string, string>();
      
      selectedTransactions.forEach(selectedT => {
        if (selectedT.categoryId) {
          // Already categorized, skip
          return;
        }

        // Find transactions with same UPI ID or Account Number
        const matchingTransactions = allTransactions.filter(t => {
          if (t.id === selectedT.id) return false; // Exclude self
          
          // Match by UPI ID
          if (selectedT.upiId && t.upiId && 
              selectedT.upiId.toLowerCase().trim() === t.upiId.toLowerCase().trim()) {
            return true;
          }
          
          // Match by Account Number
          if (selectedT.accountNumber && t.accountNumber && 
              selectedT.accountNumber.trim() === t.accountNumber.trim()) {
            return true;
          }
          
          return false;
        });

        // Find most common category among matching transactions
        if (matchingTransactions.length > 0) {
          const categoryCounts = new Map<string, number>();
          matchingTransactions.forEach(t => {
            if (t.categoryId) {
              categoryCounts.set(t.categoryId, (categoryCounts.get(t.categoryId) || 0) + 1);
            }
          });

          if (categoryCounts.size > 0) {
            const mostCommon = Array.from(categoryCounts.entries())
              .sort((a, b) => b[1] - a[1])[0][0];
            categorySuggestions.set(selectedT.id, mostCommon);
          }
        }
      });

      if (categorySuggestions.size === 0) {
        showError('Info', 'No category patterns found. Please categorize some transactions with the same UPI/Account manually first.');
        setIsBulkUpdating(false);
        return;
      }

      // Apply category suggestions
      const updates = Array.from(categorySuggestions.entries()).map(([id, categoryId]) => ({
        id,
        categoryId,
      }));

      const results = await Promise.allSettled(
        updates.map(update => 
          fetch(`/api/transactions/${update.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: update.categoryId }),
          })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      success('Success', `Auto-categorized ${successCount} transaction(s) based on UPI/Account patterns`);
      setSelectedIds(new Set());
      setShowBulkCategorize(false);
      setBulkCategoryId('');
      fetchTransactions();
    } catch (error) {
      console.error('Error auto-categorizing transactions:', error);
      showError('Error', 'Failed to auto-categorize transactions');
    } finally {
      setIsBulkUpdating(false);
    }
  }, [selectedIds, transactions, fetchTransactions, success, showError]);

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
          fetch(`/api/transactions/${update.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: update.categoryId }),
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
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      const supportedExtensions = ['.pdf', '.xls', '.xlsx', '.doc', '.docx', '.txt'];
      const hasValidType = supportedTypes.includes(file.type);
      const hasValidExtension = supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (!hasValidType && !hasValidExtension) {
        setFileError('Please select a valid file (PDF, XLS, XLSX, DOC, DOCX, or TXT)');
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
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      const supportedExtensions = ['.pdf', '.xls', '.xlsx', '.doc', '.docx', '.txt'];
      const hasValidType = supportedTypes.includes(file.type);
      const hasValidExtension = supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (hasValidType || hasValidExtension) {
        setSelectedFile(file);
        setFileError(null);
        // Auto-parse the file after drop
        setTimeout(() => handleParseFile(file), 100);
      } else {
        setFileError('Please drop a valid file (PDF, XLS, XLSX, DOC, DOCX, or TXT)');
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

    try {
      // Simulate progressive parse progress up to 90%
      const parseTimer = setInterval(() => {
        setParseProgress((p) => (p < 90 ? Math.min(90, p + 5) : p));
      }, 400);
      const lowerName = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');

      if (isPdf) {
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
        
        const transactionsToSet = data.transactions || [];
        setParsedTransactions(transactionsToSet);
        setStatementMetadata(data.metadata || null);
        setTempFiles(data.tempFiles || []);
        setShowCsvPreview(true);
        setShowFileDialog(false);
        
        success('PDF Parsed', `Extracted ${data.count || transactionsToSet.length} transactions`);
        setParseProgress(100);
        clearInterval(parseTimer);
        return;
      }

      // Fallback to multi-format parser for non-PDF
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/parse-file', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to parse file (Status: ${response.status})`);
      }
      const data = await response.json();
      setParsedTransactions(data.transactions || []);
      setTempFiles(data.tempFiles || []);
      setShowCsvPreview(true);
      setShowFileDialog(false);
      success('File Parsed', `Extracted ${data.count || (data.transactions || []).length} transactions`);
      setParseProgress(100);
    } catch (error) {
      console.error('Error parsing file:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setIsParsingFile(false);
      setTimeout(() => setParseProgress(0), 1000);
    }
  };

  // Import parsed transactions using batch API
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
                    } catch {}
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

      const importPayload: any = { 
        userId: user.id, 
        records: normalized,
        ...(documentMeta ? { document: documentMeta } : {}),
      };
      
      // Add metadata if available
      if (statementMetadata) {
        importPayload.metadata = statementMetadata;
      }
      
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
      
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warning: string) => {
          console.warn('  -', warning);
        });
      }
      
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((error: string) => {
          showError('Import Error', error);
        });
      }
      
      if (result.balanceValidation?.warning) {
        message += `. Note: ${result.balanceValidation.warning}`;
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
    <div className="w-full bg-background pb-20 lg:pb-6">
      {/* Mobile Header */}
      <MobileHeader
        title="Transactions"
        subtitle={`${pagination.total > 0 ? `${pagination.total.toLocaleString()} total` : `${filteredTransactions.length} shown`}${selectedIds.size > 0 ? ` • ${selectedIds.size} selected` : ''}`}
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSelectionMode(!showSelectionMode)}
              className={`p-2 rounded-md hover:bg-muted ${showSelectionMode ? 'bg-primary/10' : ''}`}
              aria-label={showSelectionMode ? 'Hide Selection' : 'Show Selection'}
            >
              <CheckSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFileDialog(true)}
              className="p-2 rounded-md hover:bg-muted"
              aria-label="Parse File"
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
                  setShowSelectionMode(!showSelectionMode);
                  if (!showSelectionMode) {
                    setSelectedIds(new Set());
                  }
                }}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                {showSelectionMode ? 'Hide Selection' : 'Select'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFileDialog(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Parse File
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

      {/* Selection Toolbar - Only show when selection mode is active */}
      {showSelectionMode && (
        <div className="sticky top-16 md:top-32 z-20 bg-primary/5 border-b px-4 py-2">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
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
      <div className={`hidden md:block sticky ${showSelectionMode ? 'top-40' : 'top-32'} z-20 bg-background/95 backdrop-blur border-b`}>
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="flex-1 min-w-[200px] max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search transactions..."
                    className="w-full pl-10 pr-10 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {localSearch && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Filter Chips - Desktop */}
              <div className="flex gap-2">
                {typeOptions.map((option) => {
                  const isActive = financialCategory === option.value || (option.value === 'ALL' && financialCategory === 'ALL');
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateURLParams({ type: option.value, page: '1' })} // Reset to page 1
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      aria-pressed={isActive}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {/* Amount Filter Chips */}
              <div className="flex gap-2 flex-wrap">
                {amountOptions.map((option) => {
                  const isActive = amountPreset === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateURLParams({ amountPreset: option.value === 'all' ? null : option.value, page: '1' })}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      aria-pressed={isActive}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {/* Category Filter - Desktop */}
              <Select 
                value={selectedCategoryId || 'all'} 
                onValueChange={(value) => {
                  setSelectedCategoryId(value === 'all' ? '' : value);
                  updateURLParams({ categoryId: value === 'all' ? null : value, page: '1' });
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
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

              {/* Date Range */}
              <DateRangeFilter
                startDate={localStartDate}
                endDate={localEndDate}
                onRangeChange={(start, end, preset) => {
                  setLocalStartDate(start);
                  setLocalEndDate(end);
                  updateURLParams({ startDate: start, endDate: end, range: preset });
                }}
              />

              {/* Refresh */}
              <Button
                variant="outline"
                size="icon"
                onClick={fetchTransactions}
                disabled={isLoading}
                className="flex-shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Summary Cards - Compact, always 2 columns */}
        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
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
                    className={`absolute left-2 top-2 z-10 p-1.5 rounded-md bg-background/90 backdrop-blur shadow-sm border ${
                      selectedIds.has(transaction.id) ? 'text-primary border-primary' : 'text-muted-foreground border-border'
                    }`}
                  >
                    {selectedIds.has(transaction.id) ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                )}
                <div className={showSelectionMode && selectedIds.has(transaction.id) ? 'ring-2 ring-primary rounded-lg' : ''}>
                  <TransactionCard
                    transaction={transaction}
                    onEdit={showSelectionMode ? undefined : (t) => {
                      setEditingTransaction(t);
                      setShowForm(true);
                    }}
                    onDelete={showSelectionMode ? undefined : (t) => {
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
                      className={`px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                        isActive
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
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        isActive
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
                setSelectedCategoryId(value === 'all' ? '' : value);
                updateURLParams({ categoryId: value === 'all' ? null : value, page: '1' });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
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
                              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                                bulkCategoryId === category.id
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
                              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                                bulkCategoryId === category.id
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
          icon={<Plus className="w-6 h-6" />}
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
                      <li><strong>XLS/XLSX:</strong> Excel spreadsheets with transaction data</li>
                      <li><strong>DOC/DOCX:</strong> Word documents with financial data</li>
                      <li><strong>TXT:</strong> Text files with transaction information</li>
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
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging 
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
                    accept=".pdf,.xls,.xlsx,.doc,.docx,.txt"
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
                        <input type="checkbox" checked={previewMonthOnly} onChange={(e)=>{ setPreviewMonthOnly(e.target.checked); setPreviewPage(1); }} />
                        Current month only
                      </label>
                      <div className="flex items-center gap-2 text-xs">
                        <span>Rows per page</span>
                        <select value={previewPageSize} onChange={(e)=>{ setPreviewPageSize(parseInt(e.target.value||'200')); setPreviewPage(1); }} className="border rounded px-1 py-0.5 bg-background text-foreground">
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
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    isIncome 
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
                          <button className="px-2 py-1 border rounded disabled:opacity-50 bg-background text-foreground hover:bg-muted" onClick={()=> setPreviewPage(p => Math.max(1, p-1))} disabled={previewPage===1}>Prev</button>
                          <button className="px-2 py-1 border rounded disabled:opacity-50 bg-background text-foreground hover:bg-muted" onClick={()=> setPreviewPage(p => Math.min(totalPages, p+1))} disabled={previewPage===totalPages}>Next</button>
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
