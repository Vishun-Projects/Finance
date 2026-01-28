import { Suspense } from 'react';
import ExpenseManagementPageClient from '@/app/(app)/expense-management/page-client';
import PageSkeleton from '@/components/page-skeleton';
import { requireUser } from '@/lib/auth/server-auth';
import { getCurrentMonthRange } from '@/lib/date-range';
import { loadTransactionsBootstrap, loadTransactionCategories } from '@/lib/loaders/transactions';

export const dynamic = 'force-dynamic';

export default async function ExpenseManagementPage() {
    const user = await requireUser({ redirectTo: '/auth?tab=login' });
    const range = getCurrentMonthRange();

    let transactionsData: any = null;
    let categories: any[] = [];

    try {
        const [transactionsResult, categoriesResult] = await Promise.all([
            loadTransactionsBootstrap({ startDate: range.startDate, endDate: range.endDate, pageSize: 100 }),
            loadTransactionCategories(),
        ]);

        transactionsData = transactionsResult;
        categories = categoriesResult;
    } catch (error) {
        console.error('[expense-management] bootstrap fetch failed', error);
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
            <ExpenseManagementPageClient bootstrap={bootstrap} />
        </Suspense>
    );
}
