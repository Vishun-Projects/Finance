
import { Suspense } from 'react';
import FinancialHealthPageClient, { FinancialHealthData } from './page-client';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import { requireUser } from '@/lib/auth/server-auth';
import { loadDashboardSummary } from '@/lib/loaders/dashboard';
import { getCurrentMonthRange, formatMonthLabel } from '@/lib/date-range';

export const dynamic = 'force-dynamic';

export default async function FinancialHealthPage() {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const range = getCurrentMonthRange();

  let initialData: FinancialHealthData | null = null;
  try {
    initialData = await loadDashboardSummary({
      userId: user.id,
      startDate: range.startDate,
      endDate: range.endDate,
      revalidate: 180,
    });
  } catch (error) {
    console.error('[financial-health] failed to bootstrap data', error);
  }

  const monthLabel = formatMonthLabel(new Date(range.startDate));

  return (
    <Suspense
      fallback={
        <RouteLoadingState
          title="Loading your financial health"
          description="Collecting the latest savings and spending insights…"
          className="min-h-[50vh]"
        />
      }
    >
      <FinancialHealthPageClient
        initialData={initialData}
        defaultRange={range}
        initialMonthLabel={monthLabel}
      />
    </Suspense>
  );
}
