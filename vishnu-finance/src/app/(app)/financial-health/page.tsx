import { Suspense } from 'react';
import FinancialHealthPageClient from './page-client';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import { requireUser } from '@/lib/auth/server-auth';
import { analyzeUserFinances } from '@/lib/financial-analysis';
import { loadDashboard } from '@/features/dashboard/loaders';

export const dynamic = 'force-dynamic';

export default async function FinancialHealthPage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });

  const [summary, dashboard] = await Promise.all([
    analyzeUserFinances(user.id),
    loadDashboard(user.id),
  ]);

  return (
    <Suspense
      fallback={
        <RouteLoadingState
          title="Loading your financial health"
          description="Analyzing stability, growth, and risk metrics..."
          className="min-h-[50vh]"
        />
      }
    >
      <FinancialHealthPageClient initialData={summary} monthContext={dashboard} />
    </Suspense>
  );
}
