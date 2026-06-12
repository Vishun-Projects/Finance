'use server';

import { getCurrentUser } from '@/lib/auth/server-auth';
import { invalidateUserAppData } from '@/lib/server-data-cache';
import type { TransactionToCategorize } from '@/lib/transaction-categorization-service';
import {
  TransactionServiceError,
  listTransactions,
  getDailySpend,
  getCategoryBreakdown,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteTransactionsBulk,
  restoreTransactions,
  batchUpdateTransactions,
  autoCategorizeTransactions,
  categorizeTransactionsForUser,
  getCategorizeBackgroundStatus,
} from '@/lib/services/transaction-service';

async function requireUserId() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user.id;
}

function rethrowServiceError(error: unknown): never {
  if (error instanceof TransactionServiceError) {
    throw new Error(error.message);
  }
  throw error;
}

export async function listTransactionsAction(params: Record<string, unknown> = {}) {
  try {
    const userId = await requireUserId();
    return await listTransactions(userId, params);
  } catch (error) {
    rethrowServiceError(error);
  }
}

export async function dailySpendAction(params: {
  startDate?: string;
  endDate?: string;
  range?: string;
} = {}) {
  try {
    const userId = await requireUserId();
    return await getDailySpend(userId, params);
  } catch (error) {
    rethrowServiceError(error);
  }
}

export async function categoryBreakdownAction(params: {
  startDate?: string;
  endDate?: string;
  range?: string;
} = {}) {
  try {
    const userId = await requireUserId();
    return await getCategoryBreakdown(userId, params);
  } catch (error) {
    rethrowServiceError(error);
  }
}

export async function createTransactionAction(params: Record<string, unknown> & { description?: string }) {
  try {
    const userId = await requireUserId();
    const result = await createTransaction(userId, params);
    invalidateUserAppData(userId);
    return result;
  } catch (error) {
    rethrowServiceError(error);
  }
}

export async function updateTransactionAction(params: Record<string, unknown>) {
  try {
    const userId = await requireUserId();
    const result = await updateTransaction(userId, params);
    invalidateUserAppData(userId);
    return result;
  } catch (error) {
    rethrowServiceError(error);
  }
}

export async function deleteTransactionAction(params: { id: string }) {
  try {
    const userId = await requireUserId();
    const result = await deleteTransaction(userId, params);
    invalidateUserAppData(userId);
    return result;
  } catch (error) {
    rethrowServiceError(error);
  }
}

export async function bulkDeleteTransactionsAction(params: {
  transactionIds?: string[];
  filters?: {
    bankCode?: string;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
  };
}) {
  try {
    const userId = await requireUserId();
    const result = await deleteTransactionsBulk(userId, params);
    invalidateUserAppData(userId);
    return result;
  } catch (error) {
    rethrowServiceError(error);
  }
}

export async function restoreTransactionsAction(params: {
  transactionIds?: string[];
  filters?: {
    bankCode?: string;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
  };
}) {
  try {
    const userId = await requireUserId();
    const result = await restoreTransactions(userId, params);
    invalidateUserAppData(userId);
    return result;
  } catch (error) {
    rethrowServiceError(error);
  }
}

export async function batchUpdateTransactionsAction(params: {
  updates: Array<Record<string, unknown>>;
}) {
  try {
    const userId = await requireUserId();
    const result = await batchUpdateTransactions(userId, params);
    invalidateUserAppData(userId);
    return result;
  } catch (error) {
    rethrowServiceError(error);
  }
}

export async function autoCategorizeTransactionsAction() {
  try {
    const userId = await requireUserId();
    const result = await autoCategorizeTransactions(userId);
    invalidateUserAppData(userId);
    return result;
  } catch (error) {
    rethrowServiceError(error);
  }
}

export async function categorizeTransactionsAction(params: {
  transactions: TransactionToCategorize[];
}) {
  try {
    const userId = await requireUserId();
    const result = await categorizeTransactionsForUser(userId, params.transactions);
    invalidateUserAppData(userId);
    return result;
  } catch (error) {
    rethrowServiceError(error);
  }
}

export async function categorizeBackgroundStatusAction(params: { transactionIds: string[] }) {
  try {
    const userId = await requireUserId();
    return await getCategorizeBackgroundStatus(userId, params.transactionIds);
  } catch (error) {
    rethrowServiceError(error);
  }
}
