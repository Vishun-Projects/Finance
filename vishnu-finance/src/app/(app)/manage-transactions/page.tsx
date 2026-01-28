import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/server-auth';
import PageSkeleton from '@/components/page-skeleton';
import { loadManagedTransactions } from '@/lib/loaders/manage-transactions';
import { ManageTransactionsPageClient } from './page-client';

export const dynamic = 'force-dynamic';

export default async function ManageTransactionsPage() {
  await requireUser({ redirectTo: '/auth?tab=login' });

  const initialData = await loadManagedTransactions();

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManageTransactionsPageClient initialData={initialData} />
    </Suspense>
  );
}
