import { Suspense } from 'react';
import TransactionsPageClient from './page-client';
import TransactionSkeleton from '@/components/feedback/transaction-skeleton';
import { requireUser } from '@/lib/auth/server-auth';
import { getCurrentMonthRange } from '@/lib/date-range';
import { loadTransactionsBootstrap, loadTransactionCategories } from '@/lib/loaders/transactions';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });

  // Extract params from URL or fallback to current month
  const currentRange = getCurrentMonthRange();
  const startDate = (searchParams.startDate as string) || currentRange.startDate;
  const endDate = (searchParams.endDate as string) || currentRange.endDate;
  const range = (searchParams.range as string) || 'month';
  const type = (searchParams.type as any) || 'ALL';
  const search = searchParams.search as string;

  let transactionsData: Awaited<ReturnType<typeof loadTransactionsBootstrap>> | null = null;
  let categories: Awaited<ReturnType<typeof loadTransactionCategories>> = [];

  try {
    const [transactionsResult, categoriesResult] = await Promise.all([
      loadTransactionsBootstrap({
        startDate,
        endDate,
        type,
        search,
        pageSize: 100 // Safe default for initial SSR
      }),
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
    range: { startDate, endDate, range } as any,
    userId: user.id,
  };

  return (
    <Suspense fallback={<TransactionSkeleton />}>
      <TransactionsPageClient bootstrap={bootstrap} />
    </Suspense>
  );
}
