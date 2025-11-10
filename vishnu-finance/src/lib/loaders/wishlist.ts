
import { serverFetch, ServerFetchError } from '@/lib/server-fetch';
import type { WishlistResponse } from '@/types/wishlist';

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
    const response = await serverFetch<WishlistResponse>(`/api/wishlist?userId=${encodeURIComponent(userId)}&page=1&pageSize=100&includeTotal=true`, {
      cache: 'no-store',
      description: 'wishlist-bootstrap',
      revalidate: 90,
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
    console.error('[wishlist] bootstrap fetch failed', error);
    return empty;
  }
}
