import { Suspense } from 'react';
import FinancialHealthPageClient from './page-client';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import { requireUser } from '@/lib/auth/server-auth';
import { analyzeUserFinances } from '@/lib/financial-analysis';

export const dynamic = 'force-dynamic';

export default async function FinancialHealthPage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });

  // Analyze all time or 6 months? Design shows "6 Month Trend", so maybe last 6 months + current.
  // But summary logic usually takes full history or specific range.
  // We'll fetch all data to ensure trends are accurate, or default to last 6 months.
  // Let's fetch all for now to let the service handle trends.
  const summary = await analyzeUserFinances(user.id);

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
      <FinancialHealthPageClient initialData={summary} />
    </Suspense>
  );
}
