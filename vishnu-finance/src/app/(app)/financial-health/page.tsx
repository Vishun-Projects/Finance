import { Suspense } from 'react';
import FinancialHealthPageClient from './page-client';
import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { requireUser } from '@/lib/auth/server-auth';
import { loadFinancialHealthBootstrapCached } from '@/lib/server-data-cache';

export default function FinancialHealthPage() {
  return (
    <Suspense fallback={<AppRouteLoader variant="health" title="Loading financial health" />}>
      <FinancialHealthLoader />
    </Suspense>
  );
}

async function FinancialHealthLoader() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const { summary, dashboard } = await loadFinancialHealthBootstrapCached(user.id);
  return <FinancialHealthPageClient initialData={summary} monthContext={dashboard} />;
}
