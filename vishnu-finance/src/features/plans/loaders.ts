import { serverFetch, ServerFetchError } from '@/lib/server-fetch';
import type { DeadlinesResponse, Goal, WishlistResponse } from '@/features/plans/types';

export async function loadGoals(userId: string): Promise<Goal[]> {
  if (!userId) {
    return [];
  }

  try {
    const goals = await serverFetch<Goal[]>(`/api/goals?userId=${encodeURIComponent(userId)}`, {
      cache: 'no-store',
      description: 'goals-bootstrap',
      revalidate: 60,
    });
    return goals ?? [];
  } catch (error) {
    if (error instanceof ServerFetchError && error.status === 404) {
      return [];
    }
    console.error('[goals] bootstrap fetch failed', error);
    return [];
  }
}

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
    const response = await serverFetch<DeadlinesResponse>(
      `/api/deadlines?userId=${encodeURIComponent(userId)}&page=1&pageSize=100&includeTotal=true`,
      {
        cache: 'no-store',
        description: 'deadlines-bootstrap',
        revalidate: 60,
      },
    );
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

export async function loadWishlist(userId: string): Promise<WishlistResponse> {
  const empty: WishlistResponse = {
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
    const response = await serverFetch<WishlistResponse>(
      `/api/wishlist?userId=${encodeURIComponent(userId)}&page=1&pageSize=100&includeTotal=true`,
      {
        cache: 'no-store',
        description: 'wishlist-bootstrap',
        revalidate: 90,
      },
    );
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
    console.error('[wishlist] bootstrap fetch failed', error);
    return empty;
  }
}
