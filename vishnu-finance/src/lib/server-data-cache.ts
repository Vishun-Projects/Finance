import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { loadDashboard } from '@/features/dashboard/loaders';
import { loadGoals, loadDeadlines, loadWishlist } from '@/features/plans/loaders';
import { loadTransactionsBootstrap } from '@/features/transactions/loaders';
import { analyzeUserFinances } from '@/lib/financial-analysis';
import { loadScaledMoneyPlanForUser } from '@/lib/plan-income';
import { toPlanPreviewData } from '@/lib/plan-preview';

export function planPreviewTag(userId: string) {
  return `plan-preview:${userId}`;
}

export async function loadPlanPreviewCached(userId: string) {
  return unstable_cache(
    async () => {
      const [scaledPlan, dashboard] = await Promise.all([
        loadScaledMoneyPlanForUser(userId),
        loadDashboard(userId),
      ]);
      return toPlanPreviewData(scaledPlan, dashboard as unknown as Parameters<typeof toPlanPreviewData>[1]);
    },
    ['plan-preview', userId],
    { tags: [userPagesTag(userId), planPreviewTag(userId)], revalidate: 300 },
  )();
}

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
      const [goals, deadlines, wishlist] = await Promise.all([
        loadGoals(userId),
        loadDeadlines(userId),
        loadWishlist(userId),
      ]);
      const dashboard = await loadDashboard(userId, { goals, deadlines, wishlist });
      return { goals, deadlines, wishlist, dashboard };
    },
    ['plans-bootstrap', userId],
    { tags: [userPagesTag(userId), `plans:${userId}`, `dashboard:${userId}`], revalidate: 300 },
  )();
}

export async function loadTransactionsBootstrapCached(
  userId: string,
  startDate: string,
  endDate: string,
) {
  return unstable_cache(
    () =>
      loadTransactionsBootstrap({
        userId,
        startDate,
        endDate,
        includeDeleted: false,
        type: 'ALL',
        page: 1,
      }),
    ['transactions-bootstrap', userId, startDate, endDate],
    { tags: [userPagesTag(userId), `transactions:${userId}`], revalidate: 120 },
  )();
}

export async function loadFinancialHealthBootstrapCached(userId: string) {
  return unstable_cache(
    async () => {
      const [summary, dashboard] = await Promise.all([
        analyzeUserFinances(userId),
        loadDashboard(userId),
      ]);
      return { summary, dashboard: { ...dashboard, monthContext: dashboard.monthContext } };
    },
    ['financial-health-bootstrap', userId],
    { tags: [userPagesTag(userId), `dashboard:${userId}`, `financial-health:${userId}`], revalidate: 300 },
  )();
}

/** Server-side invalidation after mutations (import, bulk edit, etc.). */
export function revalidateUserAppPages(userId: string) {
  revalidateTag(userPagesTag(userId), EXPIRE_NOW);
  revalidateTag(`dashboard:${userId}`, EXPIRE_NOW);
  revalidateTag(`plans:${userId}`, EXPIRE_NOW);
  revalidateTag(`transactions:${userId}`, EXPIRE_NOW);
  revalidateTag(`financial-health:${userId}`, EXPIRE_NOW);
  revalidateTag(planPreviewTag(userId), EXPIRE_NOW);
  revalidatePath('/dashboard');
  revalidatePath('/plans');
  revalidatePath('/transactions');
  revalidatePath('/advisor');
  revalidatePath('/financial-health');
}

/** Alias for mutation handlers. */
export const invalidateUserAppData = revalidateUserAppPages;
