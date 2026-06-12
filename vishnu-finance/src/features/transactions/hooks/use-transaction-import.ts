'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useToast } from '@/contexts/ToastContext';
import { useTransactionApi } from '@/features/transactions/hooks/use-transaction-api';
import { clearAllAppRouteBootstraps } from '@/hooks/use-route-bootstrap';
import type { CurrentAccountBalance } from '@/lib/account-balance-service';
import type { ImportPreviewResult } from '@/lib/import-preview-service';

export interface BankTransaction {
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
  autoCategorized?: boolean;
  [key: string]: unknown;
}

interface UseTransactionImportOptions {
  userId?: string;
  startDate: string;
  endDate: string;
  updateURLParams: (updates: Record<string, string | null>) => void;
  fetchTransactions: () => void | Promise<void>;
}

export function useTransactionImport({
  userId,
  startDate,
  endDate,
  updateURLParams,
  fetchTransactions,
}: UseTransactionImportOptions) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const transactionApi = useTransactionApi();

  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<BankTransaction[]>([]);
  const [statementMetadata, setStatementMetadata] = useState<Record<string, unknown> | null>(null);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [previewMonthOnly, setPreviewMonthOnly] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageSize, setPreviewPageSize] = useState(200);
  const [parseProgress, setParseProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
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
  const [parsingViewMode, setParsingViewMode] = useState<
    'transactions' | 'import-check' | 'payees' | 'raw' | 'json'
  >('import-check');
  const [parserMethod, setParserMethod] = useState('primary');
  const [parseValidation, setParseValidation] = useState<{
    valid?: boolean;
    reconciled?: boolean;
    mismatch_count?: number;
    opening_balance?: number;
    closing_balance?: number;
  } | null>(null);
  const [allowImportDespiteValidation, setAllowImportDespiteValidation] = useState(false);
  const [forceInsertOnImport, setForceInsertOnImport] = useState(false);
  const [updateExistingOnImport, setUpdateExistingOnImport] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewResult | null>(null);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [importStatements, setImportStatements] = useState<
    Array<{
      id: string;
      bankCode: string;
      transactionCount: number;
      importedAt: string;
      closingBalance?: number;
      statementStartDate?: string;
      statementEndDate?: string;
      isCurrentBalanceSource?: boolean;
    }>
  >([]);
  const [accountBalance, setAccountBalance] = useState<CurrentAccountBalance | null>(null);

  const isMountedRef = useRef(true);
  const activeTimersRef = useRef<Record<string, NodeJS.Timeout | number>>({});

  const cleanupTimer = useCallback((name: string) => {
    if (activeTimersRef.current[name]) {
      clearInterval(activeTimersRef.current[name] as ReturnType<typeof setInterval>);
      clearTimeout(activeTimersRef.current[name] as ReturnType<typeof setTimeout>);
      delete activeTimersRef.current[name];
    }
  }, []);

  const registerTimer = useCallback(
    (name: string, timer: NodeJS.Timeout | number) => {
      cleanupTimer(name);
      activeTimersRef.current[name] = timer;
    },
    [cleanupTimer],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      Object.keys(activeTimersRef.current).forEach(cleanupTimer);
    };
  }, [cleanupTimer]);

  const refreshImportMeta = useCallback(async () => {
    try {
      const statementsRes = await fetch('/api/account-statements');
      if (statementsRes.ok) {
        const data = await statementsRes.json();
        setImportStatements(data.statements ?? []);
        if (data.currentBalance) setAccountBalance(data.currentBalance);
      }
    } catch (error) {
      console.error('[transactions] import meta failed', error);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    void refreshImportMeta();
  }, [userId, refreshImportMeta]);

  const openImportDialog = useCallback(() => setShowFileDialog(true), []);

  const closeImportDialog = useCallback(() => {
    setShowFileDialog(false);
    setSelectedFile(null);
    setFileError(null);
    setParsedTransactions([]);
    setShowCsvPreview(false);
  }, []);

  const toIsoDate = useCallback((value: unknown): string | null => {
    if (!value) return null;
    const iso = new Date(String(value)).toISOString().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
  }, []);

  const resolveImportDateRange = useCallback(
    (
      records: Array<{ date?: string; date_iso?: string }>,
      metadata: Record<string, unknown> | null,
      accountStatement?: { statementStartDate?: string; statementEndDate?: string } | null,
    ): [string, string] | null => {
      let start =
        toIsoDate(accountStatement?.statementStartDate) || toIsoDate(metadata?.statementStartDate);
      let end =
        toIsoDate(accountStatement?.statementEndDate) || toIsoDate(metadata?.statementEndDate);
      if (!start || !end) {
        const dates = records
          .map((r) => String(r.date_iso || r.date || '').slice(0, 10))
          .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort();
        if (dates.length === 0) return null;
        start = start || dates[0];
        end = end || dates[dates.length - 1];
      }
      if (start > end) return [end, start];
      return [start, end];
    },
    [toIsoDate],
  );

  const importRangeOverlapsFilter = useCallback(
    (importRange: [string, string], filterStart: string, filterEnd: string) =>
      importRange[0] <= filterEnd && importRange[1] >= filterStart,
    [],
  );

  const filteredParsed = useMemo(() => {
    if (!previewMonthOnly) return parsedTransactions;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return parsedTransactions.filter((t) => {
      const dStr = (t.date_iso || t.date || '').toString().slice(0, 10);
      const d = dStr ? new Date(dStr) : null;
      return d && d >= start && d <= end;
    });
  }, [parsedTransactions, previewMonthOnly]);

  const actualTotals = useMemo(() => {
    let totalCredits = 0;
    let totalDebits = 0;
    parsedTransactions.forEach((t) => {
      const creditAmount = typeof t.credit === 'number' ? t.credit : parseFloat(String(t.credit || '0'));
      const debitAmount = typeof t.debit === 'number' ? t.debit : parseFloat(String(t.debit || '0'));
      if (creditAmount > 0) totalCredits += creditAmount;
      if (debitAmount > 0) totalDebits += debitAmount;
    });
    return { totalCredits, totalDebits };
  }, [parsedTransactions]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredParsed.length / previewPageSize)),
    [filteredParsed.length, previewPageSize],
  );

  const visibleParsed = useMemo(() => {
    const startIdx = (previewPage - 1) * previewPageSize;
    return filteredParsed.slice(startIdx, startIdx + previewPageSize);
  }, [filteredParsed, previewPage, previewPageSize]);

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

  const validateFile = (file: File) => {
    const supportedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];
    const supportedExtensions = ['.pdf', '.xls', '.xlsx', '.txt', '.csv'];
    return (
      supportedTypes.includes(file.type) ||
      supportedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
  };

  const pollCategorizationProgress = useCallback(
    async (transactionIds: string[], uid: string) => {
      let attempts = 0;
      const maxAttempts = 60;
      setCategorizationProgress({ total: transactionIds.length, categorized: 0, progress: 0, isActive: true });

      const poll = async () => {
        if (!isMountedRef.current) return;
        try {
          const status = await transactionApi.categorizeBackgroundStatus({ transactionIds });
          if (isMountedRef.current) {
            setCategorizationProgress({
              total: status.total || transactionIds.length,
              categorized: status.categorized || 0,
              progress: status.progress || 0,
              isActive: true,
            });
            if (status.progress >= 100 || status.remaining === 0) {
              setCategorizationProgress((prev) =>
                prev ? { ...prev, progress: 100, isActive: false } : null,
              );
              success(`✅ Categorization complete! ${status.categorized} transactions categorized.`);
              router.refresh();
              registerTimer('catDone', setTimeout(() => setCategorizationProgress(null), 3000));
              return;
            }
            if (attempts < maxAttempts) {
              attempts++;
              registerTimer('catPoll', setTimeout(poll, 5000));
            }
          }
        } catch (error) {
          console.error('Error polling categorization status:', error);
        }
      };
      registerTimer('catPoll', setTimeout(poll, 2000));
    },
    [router, success, registerTimer],
  );

  const handleParseFile = useCallback(
    async (fileToParse?: File) => {
      const file = fileToParse || selectedFile;
      if (!file || !userId) return;

      try {
        setIsParsingFile(true);
        setParseProgress(10);
        setFileError(null);
        registerTimer(
          'parseProgress',
          setInterval(() => setParseProgress((p) => (p < 90 ? p + 2 : p)), 300),
        );

        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);
        if (selectedBank) formData.append('bankCode', selectedBank);
        if (pdfPassword) formData.append('password', pdfPassword);

        const response = await fetch('/api/parse-pdf', { method: 'POST', body: formData });
        if (!response.ok) {
          if (response.status === 401) throw new Error('PASSWORD_REQUIRED');
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
        setForceInsertOnImport(false);
        setUpdateExistingOnImport(false);
        setCategoryOverrides({});
        setImportPreview(null);
        setParsingViewMode('import-check');
        setTempFiles(data.tempFiles || []);
        setRemoteFile(data.remoteFile || null);
        setShowCsvPreview(true);
        setShowFileDialog(false);

        setImportPreviewLoading(true);
        try {
          const previewRes = await fetch('/api/import-bank-statement/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: transactionsToSet, metadata: data.metadata || null }),
          });
          if (previewRes.ok) {
            const preview = await previewRes.json();
            setImportPreview(preview);
            const initialOverrides: Record<string, string> = {};
            for (const payee of preview.payees ?? []) {
              if (payee.suggestedCategoryId && payee.bucket !== 'new') {
                initialOverrides[payee.key] = payee.suggestedCategoryId;
              }
            }
            setCategoryOverrides(initialOverrides);
          }
        } catch (previewError) {
          console.error('[transactions] import preview failed', previewError);
        } finally {
          setImportPreviewLoading(false);
        }

        success('PDF Parsed', `Extracted ${data.count || transactionsToSet.length} transactions`);
        setParseProgress(100);
      } catch (error) {
        if (!isMountedRef.current) return;
        const msg = error instanceof Error ? error.message : 'Failed to parse file';
        if (msg === 'PASSWORD_REQUIRED') {
          setFileError('The PDF is password protected. Please enter the password below.');
          setShowFileDialog(true);
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
    },
    [
      selectedFile,
      userId,
      selectedBank,
      pdfPassword,
      success,
      cleanupTimer,
      registerTimer,
    ],
  );

  const handleMultiFormatFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!validateFile(file)) {
        setFileError('Please select a valid PDF, Excel, or Text file');
        return;
      }
      setSelectedFile(file);
      setFileError(null);
      setTimeout(() => void handleParseFile(file), 100);
    },
    [handleParseFile],
  );

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
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (validateFile(file)) {
        setSelectedFile(file);
        setFileError(null);
        setTimeout(() => void handleParseFile(file), 100);
      } else {
        setFileError('Please drop a valid PDF, Excel, or Text file');
      }
    },
    [handleParseFile],
  );

  const handleImportParsedTransactions = useCallback(async () => {
    if (!parsedTransactions.length || !userId) return;
    if (parseValidation?.valid === false && !allowImportDespiteValidation) {
      setFileError('Balance reconciliation failed. Review the summary or check "Import anyway" to continue.');
      return;
    }

    setIsImporting(true);
    setImportProgress(5);
    setFileError(null);

    const normalized = parsedTransactions
      .map((t) => {
        try {
          const debitAmount = typeof t.debit === 'number' ? t.debit : parseFloat(String(t.debit || '0'));
          const creditAmount = typeof t.credit === 'number' ? t.credit : parseFloat(String(t.credit || '0'));
          const description = String(t.description || t.narration || '').trim();
          if ((debitAmount === 0 && creditAmount === 0) || !description) return null;

          let dateStr = '';
          let dateIsoStr = '';
          if (t.date_iso) {
            dateIsoStr = String(t.date_iso).slice(0, 10);
            dateStr = dateIsoStr;
          } else if (t.date) {
            const dateInput = String(t.date);
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.slice(0, 10))) {
              dateIsoStr = dateInput.slice(0, 10);
              dateStr = dateIsoStr;
            } else {
              try {
                const parsedDate = new Date(dateInput);
                if (!isNaN(parsedDate.getTime())) {
                  dateIsoStr = parsedDate.toISOString().slice(0, 10);
                  dateStr = dateIsoStr;
                }
              } catch {
                const dateMatch = dateInput.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                  const parsedDate = new Date(dateMatch[0]);
                  if (!isNaN(parsedDate.getTime())) {
                    dateIsoStr = parsedDate.toISOString().slice(0, 10);
                    dateStr = dateIsoStr;
                  }
                }
              }
            }
          }
          if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

          return {
            debit: debitAmount,
            credit: creditAmount,
            description,
            title: description,
            date: dateStr,
            date_iso: dateIsoStr || dateStr,
            category: t.category ? String(t.category) : '',
            notes: t.commodity || '',
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
            balance: t.balance
              ? typeof t.balance === 'number'
                ? t.balance
                : parseFloat(String(t.balance))
              : null,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (!normalized.length) {
      showError('No valid records', 'No transactions to import');
      setIsImporting(false);
      return;
    }

    const primaryTempFile = remoteFile || tempFiles[0];
    const documentMeta =
      selectedFile && primaryTempFile
        ? {
            storageKey: primaryTempFile,
            originalName: selectedFile.name,
            mimeType: selectedFile.type || 'application/pdf',
            fileSize: selectedFile.size,
          }
        : undefined;

    const importPayload: Record<string, unknown> = {
      userId,
      records: normalized,
      useAICategorization: true,
      categorizeInBackground: normalized.length > 100,
      validateBalance: true,
      forceInsert: forceInsertOnImport,
      updateExisting: updateExistingOnImport,
      categoryOverrides,
      ...(documentMeta ? { document: documentMeta } : {}),
      ...(statementMetadata ? { metadata: statementMetadata } : {}),
    };

    try {
      registerTimer(
        'importProgress',
        setInterval(() => setImportProgress((p) => (p < 90 ? Math.min(90, p + 4) : p)), 300),
      );

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
      let message = `Inserted ${result.inserted || 0} records`;
      if (result.backgroundCategorization?.started) {
        message += `. Background categorization started`;
        if (result.backgroundCategorization.transactionIds?.length > 0) {
          void pollCategorizationProgress(result.backgroundCategorization.transactionIds, userId);
        }
      }

      const importRange = resolveImportDateRange(
        normalized.filter((r): r is NonNullable<typeof r> => r !== null),
        statementMetadata,
        result.accountStatement,
      );
      const shouldExpandDateFilter = Boolean(
        importRange &&
          startDate &&
          endDate &&
          !importRangeOverlapsFilter(importRange, startDate, endDate),
      );

      success('Imported', message);
      setImportProgress(100);
      clearAllAppRouteBootstraps();

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
      await refreshImportMeta();

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
          } catch {
            /* import succeeded */
          }
        }
      }

      if (isMountedRef.current) {
        setShowCsvPreview(false);
        setParsedTransactions([]);
        setImportPreview(null);
      }
    } catch (e) {
      if (isMountedRef.current) {
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
  }, [
    parsedTransactions,
    userId,
    parseValidation,
    allowImportDespiteValidation,
    remoteFile,
    tempFiles,
    selectedFile,
    forceInsertOnImport,
    updateExistingOnImport,
    categoryOverrides,
    statementMetadata,
    startDate,
    endDate,
    resolveImportDateRange,
    importRangeOverlapsFilter,
    updateURLParams,
    fetchTransactions,
    refreshImportMeta,
    pollCategorizationProgress,
    success,
    showError,
    cleanupTimer,
    registerTimer,
  ]);

  return {
    showFileDialog,
    setShowFileDialog,
    selectedFile,
    fileError,
    isParsingFile,
    parsedTransactions,
    statementMetadata,
    showCsvPreview,
    selectedBank,
    setSelectedBank,
    previewMonthOnly,
    setPreviewMonthOnly,
    previewPage,
    setPreviewPage,
    previewPageSize,
    setPreviewPageSize,
    parseProgress,
    importProgress,
    pdfPassword,
    setPdfPassword,
    isDragging,
    isImporting,
    categorizationProgress,
    parsingViewMode,
    setParsingViewMode,
    parserMethod,
    parseValidation,
    allowImportDespiteValidation,
    setAllowImportDespiteValidation,
    forceInsertOnImport,
    setForceInsertOnImport,
    updateExistingOnImport,
    setUpdateExistingOnImport,
    importPreview,
    importPreviewLoading,
    categoryOverrides,
    setCategoryOverrides,
    importStatements,
    accountBalance,
    filteredParsed,
    visibleParsed,
    totalPages,
    actualTotals,
    setShowCsvPreview,
    setParsedTransactions,
    setCategorizationProgress,
    openImportDialog,
    closeImportDialog,
    handleMultiFormatFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleParseFile,
    handleImportParsedTransactions,
    formatPreviewDate,
    getPreviewDescription,
    refreshImportMeta,
  };
}
