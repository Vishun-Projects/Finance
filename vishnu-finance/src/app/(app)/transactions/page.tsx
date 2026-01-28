import { Suspense } from 'react';
import TransactionsPageClient from './page-client';
import PageSkeleton from '@/components/page-skeleton';
import { requireUser } from '@/lib/auth/server-auth';
import { getCurrentMonthRange } from '@/lib/date-range';
import { loadTransactionsBootstrap, loadTransactionCategories } from '@/lib/loaders/transactions';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const range = getCurrentMonthRange();

  let transactionsData: Awaited<ReturnType<typeof loadTransactionsBootstrap>> | null = null;
  let categories: Awaited<ReturnType<typeof loadTransactionCategories>> = [];

  try {
    const [transactionsResult, categoriesResult] = await Promise.all([
      loadTransactionsBootstrap({ startDate: range.startDate, endDate: range.endDate }),
      loadTransactionCategories(),
    ]);

    transactionsData = transactionsResult;
    categories = categoriesResult;
  } catch (error) {
    // console.error('[transactions] bootstrap fetch failed', error);
  }

  const bootstrap = {
    transactions: transactionsData?.transactions ?? [],
    pagination: transactionsData?.pagination,
    totals: transactionsData?.totals ?? null,
    categories,
    range,
    userId: user.id,
  };

  return (
    <Suspense fallback={<PageSkeleton />}>
      <TransactionsPageClient bootstrap={bootstrap} />
    </Suspense>
  );
}
