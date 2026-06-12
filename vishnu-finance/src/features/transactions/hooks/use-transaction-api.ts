'use client';

import { useCallback, useMemo } from 'react';
import type { TransactionToCategorize } from '@/lib/transaction-categorization-service';
import {
  listTransactionsAction,
  dailySpendAction,
  categoryBreakdownAction,
  createTransactionAction,
  updateTransactionAction,
  deleteTransactionAction,
  bulkDeleteTransactionsAction,
  restoreTransactionsAction,
  batchUpdateTransactionsAction,
  autoCategorizeTransactionsAction,
  categorizeTransactionsAction,
  categorizeBackgroundStatusAction,
} from '@/features/transactions/actions';

export function useTransactionApi() {
  const list = useCallback(
    (params: Record<string, unknown> = {}) => listTransactionsAction(params),
    [],
  );

  const dailySpend = useCallback(
    (params: { startDate?: string; endDate?: string; range?: string } = {}) =>
      dailySpendAction(params),
    [],
  );

  const categoryBreakdown = useCallback(
    (params: { startDate?: string; endDate?: string; range?: string } = {}) =>
      categoryBreakdownAction(params),
    [],
  );

  const create = useCallback(
    (params: Record<string, unknown>) => createTransactionAction(params),
    [],
  );

  const update = useCallback(
    (params: Record<string, unknown>) => updateTransactionAction(params),
    [],
  );

  const remove = useCallback(
    (params: { id: string }) => deleteTransactionAction(params),
    [],
  );

  const bulkDelete = useCallback(
    (params: {
      transactionIds?: string[];
      filters?: {
        bankCode?: string;
        transactionType?: string;
        startDate?: string;
        endDate?: string;
      };
    }) => bulkDeleteTransactionsAction(params),
    [],
  );

  const restore = useCallback(
    (params: {
      transactionIds?: string[];
      filters?: {
        bankCode?: string;
        transactionType?: string;
        startDate?: string;
        endDate?: string;
      };
    }) => restoreTransactionsAction(params),
    [],
  );

  const batchUpdate = useCallback(
    (params: { updates: Array<Record<string, unknown>> }) =>
      batchUpdateTransactionsAction(params),
    [],
  );

  const autoCategorize = useCallback(() => autoCategorizeTransactionsAction(), []);

  const categorize = useCallback(
    (params: { transactions: TransactionToCategorize[] }) =>
      categorizeTransactionsAction(params),
    [],
  );

  const categorizeBackgroundStatus = useCallback(
    (params: { transactionIds: string[] }) => categorizeBackgroundStatusAction(params),
    [],
  );

  return useMemo(
    () => ({
      list,
      dailySpend,
      categoryBreakdown,
      create,
      update,
      delete: remove,
      bulkDelete,
      restore,
      batchUpdate,
      autoCategorize,
      categorize,
      categorizeBackgroundStatus,
    }),
    [
      list,
      dailySpend,
      categoryBreakdown,
      create,
      update,
      remove,
      bulkDelete,
      restore,
      batchUpdate,
      autoCategorize,
      categorize,
      categorizeBackgroundStatus,
    ],
  );
}
