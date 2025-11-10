
import { serverFetch, ServerFetchError } from '@/lib/server-fetch';
import type { ManageTransactionsResponse } from '@/types/transactions';

export async function loadManagedTransactions(query?: string): Promise<ManageTransactionsResponse> {
  const defaultResponse: ManageTransactionsResponse = {
    transactions: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 0,
      totalPages: 0,
    },
  };

  const search = query ? `&${query}` : '';
  try {
    const data = await serverFetch<ManageTransactionsResponse>(
      `/api/transactions/manage?includeDeleted=true&limit=200${search}`,
      {
        cache: 'no-store',
        description: 'manage-transactions-bootstrap',
        revalidate: 60,
      },
    );

    if (!data) {
      return defaultResponse;
    }

    return {
      transactions: data.transactions ?? [],
      pagination: data.pagination ?? defaultResponse.pagination,
    };
  } catch (error) {
    if (error instanceof ServerFetchError && error.status === 404) {
      return defaultResponse;
    }
    console.error('[manage-transactions] bootstrap fetch failed', error);
    return defaultResponse;
  }
}
