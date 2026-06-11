import { Suspense } from 'react';
import FinancialHealthPageClient from './page-client';
import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { requireUser } from '@/lib/auth/server-auth';
import { analyzeUserFinances } from '@/lib/financial-analysis';
import { loadDashboardCached } from '@/lib/server-data-cache';

export const dynamic = 'force-dynamic';

export default function FinancialHealthPage() {
  return (
    <Suspense fallback={<AppRouteLoader variant="generic" title="Loading financial health" />}>
      <FinancialHealthLoader />
    </Suspense>
  );
}

async function FinancialHealthLoader() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });

  const [summary, dashboard] = await Promise.all([
    analyzeUserFinances(user.id),
    loadDashboardCached(user.id),
  ]);

  return <FinancialHealthPageClient initialData={summary} monthContext={dashboard} />;
}
