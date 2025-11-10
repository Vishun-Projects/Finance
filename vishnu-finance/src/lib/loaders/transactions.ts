
import type { Transaction } from '@/types';
import { serverFetch } from '@/lib/server-fetch';

export interface TransactionPagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TransactionTotals {
  income: number;
  expense: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: TransactionPagination;
  totals?: TransactionTotals | null;
}

export interface TransactionCategorySummary {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color?: string;
}

interface LoadTransactionsParams {
  startDate: string;
  endDate: string;
  includeDeleted?: boolean;
  type?: 'INCOME' | 'EXPENSE' | 'ALL';
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function loadTransactionsBootstrap({
  startDate,
  endDate,
  includeDeleted = false,
  type = 'ALL',
  search,
  page = 1,
  pageSize = 100,
}: LoadTransactionsParams): Promise<TransactionsResponse> {
  const params = new URLSearchParams({
    startDate,
    endDate,
    sortField: 'transactionDate',
    sortDirection: 'desc',
    page: page.toString(),
    pageSize: pageSize.toString(),
    includeTotals: 'true',
  });

  if (includeDeleted) {
    params.set('includeDeleted', 'true');
  }

  if (type !== 'ALL') {
    params.set('type', type);
  }

  if (search) {
    params.set('search', search);
  }

  const data = await serverFetch<TransactionsResponse>(`/api/transactions?${params.toString()}`, {
    cache: 'no-store',
    description: 'transactions-bootstrap',
    revalidate: 60,
  });

  return {
    transactions: data.transactions ?? [],
    pagination: data.pagination ?? { total: 0, page, pageSize, totalPages: 0 },
    totals: data.totals ?? null,
  };
}

export async function loadTransactionCategories(): Promise<TransactionCategorySummary[]> {
  const data = await serverFetch<TransactionCategorySummary[]>('/api/categories', {
    cache: 'no-store',
    description: 'transaction-categories',
    revalidate: 300,
  });

  return data ?? [];
}
