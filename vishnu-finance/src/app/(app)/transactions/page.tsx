import { Suspense } from 'react';
import TransactionsPageClient from './page-client';
import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { requireUser } from '@/lib/auth/server-auth';
import { getCurrentMonthRange } from '@/lib/date-range';
import { TRANSACTION_PAGE_SIZE } from '@/features/transactions/constants';
import { loadTransactionsBootstrap, loadTransactionCategories } from '@/features/transactions/loaders';
import { loadTransactionsBootstrapCached } from '@/lib/server-data-cache';

type TransactionsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function TransactionsPage({ searchParams }: TransactionsPageProps) {
  return (
    <Suspense fallback={<AppRouteLoader variant="transactions" title="Loading transactions" />}>
      <TransactionsLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function TransactionsLoader({ searchParams }: TransactionsPageProps) {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const resolvedSearchParams = await searchParams;

  const currentRange = getCurrentMonthRange();
  const startDate = (resolvedSearchParams.startDate as string) || currentRange.startDate;
  const endDate = (resolvedSearchParams.endDate as string) || currentRange.endDate;
  const range = (resolvedSearchParams.range as string) || 'month';
  const type = (resolvedSearchParams.type as 'INCOME' | 'EXPENSE' | 'ALL') || 'ALL';
  const search = resolvedSearchParams.search as string | undefined;

  let transactionsData: Awaited<ReturnType<typeof loadTransactionsBootstrap>> | null = null;
  let categories: Awaited<ReturnType<typeof loadTransactionCategories>> = [];

  const isDefaultView =
    range === 'month' &&
    type === 'ALL' &&
    !search &&
    startDate === currentRange.startDate &&
    endDate === currentRange.endDate;

  try {
    const [transactionsResult, categoriesResult] = await Promise.all([
      isDefaultView
        ? loadTransactionsBootstrapCached(user.id, startDate, endDate)
        : loadTransactionsBootstrap({
            userId: user.id,
            startDate,
            endDate,
            type,
            search,
            pageSize: TRANSACTION_PAGE_SIZE,
          }),
      loadTransactionCategories(user.id),
    ]);

    transactionsData = transactionsResult;
    categories = categoriesResult;
  } catch {
    // Client can recover via refetch
  }

  const bootstrap = {
    transactions: transactionsData?.transactions ?? [],
    pagination: transactionsData?.pagination,
    totals: transactionsData?.totals ?? null,
    categories,
    range: { startDate, endDate, range } as { startDate: string; endDate: string; range: string },
    userId: user.id,
  };

  return <TransactionsPageClient bootstrap={bootstrap} />;
}
