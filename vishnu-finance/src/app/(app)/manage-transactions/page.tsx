
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/server-auth';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import { loadManagedTransactions } from '@/lib/loaders/manage-transactions';
import { ManageTransactionsPageClient } from './page-client';

export const dynamic = 'force-dynamic';

export default async function ManageTransactionsPage() {
  await requireUser({ redirectTo: '/auth?tab=login' });

  const initialData = await loadManagedTransactions();

  return (
    <Suspense
      fallback={
        <RouteLoadingState
          title="Loading transaction manager"
          description="Preparing your transaction archive…"
          className="min-h-[50vh]"
        />
      }
    >
      <ManageTransactionsPageClient initialData={initialData} />
    </Suspense>
  );
}
