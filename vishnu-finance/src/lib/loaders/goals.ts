
import { serverFetch, ServerFetchError } from '@/lib/server-fetch';
import type { Goal } from '@/types/goals';

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
