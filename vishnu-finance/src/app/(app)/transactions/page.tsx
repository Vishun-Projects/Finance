import { Suspense } from 'react';
import TransactionsPageClient from './page-client';
import TransactionSkeleton from '@/components/feedback/transaction-skeleton';
import { requireUser } from '@/lib/auth/server-auth';
import { getCurrentMonthRange } from '@/lib/date-range';
import { TRANSACTION_PAGE_SIZE } from '@/features/transactions/constants';
import { loadTransactionsBootstrap, loadTransactionCategories } from '@/features/transactions/loaders';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const resolvedSearchParams = await searchParams;

  // Extract params from URL or fallback to current month
  const currentRange = getCurrentMonthRange();
  const startDate = (resolvedSearchParams.startDate as string) || currentRange.startDate;
  const endDate = (resolvedSearchParams.endDate as string) || currentRange.endDate;
  const range = (resolvedSearchParams.range as string) || 'month';
  const type = (resolvedSearchParams.type as any) || 'ALL';
  const search = resolvedSearchParams.search as string;

  let transactionsData: Awaited<ReturnType<typeof loadTransactionsBootstrap>> | null = null;
  let categories: Awaited<ReturnType<typeof loadTransactionCategories>> = [];

  try {
    const [transactionsResult, categoriesResult] = await Promise.all([
      loadTransactionsBootstrap({
        startDate,
        endDate,
        type,
        search,
        pageSize: TRANSACTION_PAGE_SIZE,
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
