import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { loadDashboard } from '@/features/dashboard/loaders';
import { loadGoals, loadDeadlines, loadWishlist } from '@/features/plans/loaders';

const EXPIRE_NOW = { expire: 0 } as const;

/** Shared tag — invalidate all cached app pages for a user (e.g. after PDF import). */
export function userPagesTag(userId: string) {
  return `user-pages:${userId}`;
}

export async function loadDashboardCached(userId: string) {
  return unstable_cache(
    () => loadDashboard(userId),
    ['dashboard-bootstrap', userId],
    { tags: [userPagesTag(userId), `dashboard:${userId}`], revalidate: 300 },
  )();
}

export async function loadPlansPageBootstrapCached(userId: string) {
  return unstable_cache(
    async () => {
      const [goals, deadlines, wishlist, dashboard] = await Promise.all([
        loadGoals(userId),
        loadDeadlines(userId),
        loadWishlist(userId),
        loadDashboard(userId),
      ]);
      return { goals, deadlines, wishlist, dashboard };
    },
    ['plans-bootstrap', userId],
    { tags: [userPagesTag(userId), `plans:${userId}`, `dashboard:${userId}`], revalidate: 300 },
  )();
}

/** Server-side invalidation after mutations (import, bulk edit, etc.). */
export function revalidateUserAppPages(userId: string) {
  revalidateTag(userPagesTag(userId), EXPIRE_NOW);
  revalidateTag(`dashboard:${userId}`, EXPIRE_NOW);
  revalidateTag(`plans:${userId}`, EXPIRE_NOW);
  revalidatePath('/dashboard');
  revalidatePath('/plans');
  revalidatePath('/transactions');
  revalidatePath('/advisor');
}

/** Alias for mutation handlers. */
export const invalidateUserAppData = revalidateUserAppPages;
