'use client';

import { useState, useCallback } from 'react';
import type { Transaction } from '@/types';
import { useTransactionApi } from '@/features/transactions/hooks/use-transaction-api';

interface UseTransactionSelectionOptions {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  userId?: string;
  fetchTransactions: () => void | Promise<void>;
  success: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
}

export function useTransactionSelection({
  transactions,
  filteredTransactions,
  fetchTransactions,
  success,
  showError,
}: UseTransactionSelectionOptions) {
  const transactionApi = useTransactionApi();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSelectionMode, setShowSelectionMode] = useState(false);
  const [showBulkCategorize, setShowBulkCategorize] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [applyToAllMatching, setApplyToAllMatching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  }, [selectedIds.size, filteredTransactions]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) {
      showError('Error', 'Please select transactions to delete');
      return;
    }
    setIsDeleting(true);
    try {
      const data = await transactionApi.bulkDelete({
        transactionIds: Array.from(selectedIds),
      });
      success('Success', `Deleted ${(data as { deletedCount?: number }).deletedCount || selectedIds.size} transaction(s)`);
      setShowBulkDeleteDialog(false);
      setSelectedIds(new Set());
      await fetchTransactions();
    } catch (error) {
      console.error('Error deleting transactions:', error);
      showError('Error', 'Failed to delete transactions');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, fetchTransactions, success, showError, transactionApi]);

  const handleBulkRestore = useCallback(async () => {
    const deletedSelected = Array.from(selectedIds).filter((id) => {
      const transaction = transactions.find((t) => t.id === id);
      return transaction?.isDeleted;
    });
    if (deletedSelected.length === 0) {
      showError('Error', 'Please select deleted transactions to restore');
      return;
    }
    setIsDeleting(true);
    try {
      const data = await transactionApi.restore({ transactionIds: deletedSelected });
      success('Success', `Restored ${(data as { restoredCount?: number }).restoredCount || deletedSelected.length} transaction(s)`);
      setSelectedIds(new Set());
      await fetchTransactions();
    } catch (error) {
      console.error('Error restoring transactions:', error);
      showError('Error', 'Failed to restore transactions');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, transactions, fetchTransactions, success, showError, transactionApi]);

  const handleAutoCategorizeSelected = useCallback(async () => {
    if (selectedIds.size === 0) {
      showError('Error', 'Please select transactions to categorize');
      return;
    }
    setIsBulkUpdating(true);
    try {
      const selectedTransactions = transactions.filter((t) => selectedIds.has(t.id) && !t.categoryId);
      if (selectedTransactions.length === 0) {
        showError('Info', 'All selected transactions are already categorized');
        return;
      }

      const transactionsToCategorize = selectedTransactions.map((t) => {
        let dateStr = '';
        if (t.transactionDate) {
          const dateValue = t.transactionDate as Date | string;
          if (typeof dateValue === 'string') dateStr = dateValue.split('T')[0].substring(0, 10);
          else if (dateValue instanceof Date) dateStr = dateValue.toISOString().split('T')[0];
          else {
            const date = new Date(dateValue as string);
            if (!isNaN(date.getTime())) dateStr = date.toISOString().split('T')[0];
          }
        }
        return {
          description: t.description || '',
          store: t.store || undefined,
          commodity: t.notes || undefined,
          amount: (t.creditAmount > 0 ? t.creditAmount : t.debitAmount) || 0,
          date: dateStr || new Date().toISOString().split('T')[0],
          financialCategory: t.financialCategory as 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER',
          personName: t.personName || undefined,
          upiId: t.upiId || undefined,
          accountNumber: t.accountNumber || undefined,
        };
      });

      const categorizationResults = await transactionApi.categorize({
        transactions: transactionsToCategorize,
      });

      if (!Array.isArray(categorizationResults)) {
        throw new Error('Failed to categorize transactions');
      }

      const updates = selectedTransactions
        .map((t, idx) => {
          const result = categorizationResults[idx] as { categoryId?: string; financialCategory?: string };
          if (result?.categoryId) {
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
        showError('Info', 'No categories could be determined for the selected transactions.');
        return;
      }

      const batchResult = await transactionApi.batchUpdate({ updates });
      if ((batchResult as { succeeded?: number }).succeeded && (batchResult as { succeeded: number }).succeeded > 0) {
        success('Success', `Auto-categorized ${(batchResult as { succeeded: number }).succeeded} transaction(s)`);
      }
      setSelectedIds(new Set());
      setShowBulkCategorize(false);
      setBulkCategoryId('');
      await fetchTransactions();
    } catch (error) {
      console.error('Error auto-categorizing transactions:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to auto-categorize transactions');
    } finally {
      setIsBulkUpdating(false);
    }
  }, [selectedIds, transactions, fetchTransactions, success, showError, transactionApi]);

  const handleGlobalAutoCategorize = useCallback(
    async (
      setCategorizationProgress: (v: {
        total: number;
        categorized: number;
        progress: number;
        isActive: boolean;
      } | null) => void,
    ) => {
      if (isBulkUpdating) return;
      setIsBulkUpdating(true);
      setCategorizationProgress({ total: 100, categorized: 0, progress: 0, isActive: true });

      let totalUpdated = 0;
      let iterations = 0;
      const MAX_ITERATIONS = 50;

      try {
        while (iterations < MAX_ITERATIONS) {
          const result = await transactionApi.autoCategorize() as { updated?: number; remaining?: number };
          if (result.updated && result.updated > 0) {
            totalUpdated += result.updated;
            const totalRemaining = result.remaining || 0;
            const totalKnown = totalUpdated + totalRemaining;
            setCategorizationProgress({
              total: totalKnown,
              categorized: totalUpdated,
              progress: Math.min(99, Math.round((totalUpdated / (totalKnown || 1)) * 100)),
              isActive: true,
            });
            await new Promise((r) => setTimeout(r, 600));
            if (totalRemaining === 0) break;
            iterations++;
          } else break;
        }
        if (totalUpdated > 0) {
          success('Auto-Categorization Complete', `Successfully updated ${totalUpdated} entries.`);
          await fetchTransactions();
        } else {
          showError('Info', 'No new categories could be automatically determined.');
        }
      } catch (error) {
        console.error('Error in global auto-categorization:', error);
        showError('Error', error instanceof Error ? error.message : 'Failed to run auto-categorization');
      } finally {
        setIsBulkUpdating(false);
        setCategorizationProgress(null);
      }
    },
    [isBulkUpdating, fetchTransactions, success, showError, transactionApi],
  );

  const handleBulkCategorize = useCallback(async () => {
    if (selectedIds.size === 0 || !bulkCategoryId) {
      showError('Error', 'Please select transactions and a category');
      return;
    }
    setIsBulkUpdating(true);
    try {
      const selectedTransactions = transactions.filter((t) => selectedIds.has(t.id));
      let updates = Array.from(selectedIds).map((id) => ({ id, categoryId: bulkCategoryId }));

      if (applyToAllMatching) {
        const identities = new Set<string>();
        selectedTransactions.forEach((t) => {
          if (t.upiId) identities.add(`upi:${t.upiId}`);
          if (t.store) identities.add(`store:${t.store}`);
          if (t.personName) identities.add(`person:${t.personName}`);
        });
        transactions
          .filter((t) => {
            if (selectedIds.has(t.id) || t.isDeleted) return false;
            if (t.upiId && identities.has(`upi:${t.upiId}`)) return true;
            if (t.store && identities.has(`store:${t.store}`)) return true;
            if (t.personName && identities.has(`person:${t.personName}`)) return true;
            return false;
          })
          .forEach((t) => updates.push({ id: t.id, categoryId: bulkCategoryId }));
      }

      const result = await transactionApi.batchUpdate({ updates });
      success('Success', `Updated ${(result as { succeeded?: number }).succeeded || 0} transaction(s)`);
      setSelectedIds(new Set());
      setShowBulkCategorize(false);
      setBulkCategoryId('');
      setApplyToAllMatching(false);
      await fetchTransactions();
    } catch (error) {
      console.error('Error categorizing transactions:', error);
      showError('Error', 'Failed to categorize transactions');
    } finally {
      setIsBulkUpdating(false);
    }
  }, [selectedIds, bulkCategoryId, transactions, applyToAllMatching, fetchTransactions, success, showError, transactionApi]);

  return {
    selectedIds,
    setSelectedIds,
    showSelectionMode,
    setShowSelectionMode,
    showBulkCategorize,
    setShowBulkCategorize,
    showBulkDeleteDialog,
    setShowBulkDeleteDialog,
    bulkCategoryId,
    setBulkCategoryId,
    isBulkUpdating,
    applyToAllMatching,
    setApplyToAllMatching,
    isDeleting,
    toggleSelect,
    handleSelectAll,
    clearSelection,
    handleBulkDelete,
    handleBulkRestore,
    handleAutoCategorizeSelected,
    handleGlobalAutoCategorize,
    handleBulkCategorize,
  };
}
