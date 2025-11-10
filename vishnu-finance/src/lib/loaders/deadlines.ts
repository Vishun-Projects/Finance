
import { serverFetch, ServerFetchError } from '@/lib/server-fetch';
import type { DeadlinesResponse } from '@/types/deadlines';

export async function loadDeadlines(userId: string): Promise<DeadlinesResponse> {
  const empty: DeadlinesResponse = {
    data: [],
    pagination: {
      page: 1,
      pageSize: 100,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  if (!userId) {
    return empty;
  }

  try {
    const response = await serverFetch<DeadlinesResponse>(`/api/deadlines?userId=${encodeURIComponent(userId)}&page=1&pageSize=100&includeTotal=true`, {
      cache: 'no-store',
      description: 'deadlines-bootstrap',
      revalidate: 60,
    });
    if (!response) {
      return empty;
    }
    return {
      data: response.data ?? [],
      pagination: response.pagination ?? empty.pagination,
    };
  } catch (error) {
    if (error instanceof ServerFetchError && error.status === 404) {
      return empty;
    }
    console.error('[deadlines] bootstrap fetch failed', error);
    return empty;
  }
}
