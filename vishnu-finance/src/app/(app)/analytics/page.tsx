import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { requireUser } from '@/lib/auth/server-auth';
import { loadAnalyticsBootstrap } from '@/features/analytics/loaders';
import AnalyticsPage from '@/features/analytics/components/analytics-page';

export const metadata: Metadata = {
  title: 'Analytics | Vishnu Finance',
  description: 'Visual charts for income, spend, salary, patterns, and goal reachability',
};

type AnalyticsRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function AnalyticsRoutePage({ searchParams }: AnalyticsRouteProps) {
  return (
    <Suspense fallback={<AppRouteLoader variant="reports" title="Loading analytics" />}>
      <AnalyticsPageLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function AnalyticsPageLoader({ searchParams }: AnalyticsRouteProps) {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const resolvedSearchParams = await searchParams;

  const data = await loadAnalyticsBootstrap(user.id, {
    preset: typeof resolvedSearchParams.preset === 'string' ? resolvedSearchParams.preset : null,
    startDate: typeof resolvedSearchParams.startDate === 'string' ? resolvedSearchParams.startDate : null,
    endDate: typeof resolvedSearchParams.endDate === 'string' ? resolvedSearchParams.endDate : null,
  });

  return <AnalyticsPage data={data} />;
}
