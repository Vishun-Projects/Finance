import { Suspense } from 'react';
import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { requireUser } from '@/lib/auth/server-auth';
import { loadPlansPageBootstrapCached } from '@/lib/server-data-cache';
import type { PlansBootstrap } from '@/features/plans/components/plans-page';
import PlansPageClient from './page-client';

const ALLOWED_TABS = ['overview', 'goals', 'deadlines', 'wishlist'] as const;
type PlansTab = (typeof ALLOWED_TABS)[number];

const EMPTY_PLANS_BOOTSTRAP: PlansBootstrap = {
  goals: [],
  deadlines: {
    data: [],
    pagination: {
      page: 1,
      pageSize: 100,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  },
  wishlist: {
    data: [],
    pagination: {
      page: 1,
      pageSize: 100,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  },
  disciplineSummary: null,
  planIncomeContext: null,
  accountBalance: null,
};

function isValidPlansTab(tab?: string): tab is PlansTab {
  return Boolean(tab && ALLOWED_TABS.includes(tab as PlansTab));
}

type PlansPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default function PlansPage({ searchParams }: PlansPageProps) {
  return (
    <Suspense fallback={<AppRouteLoader variant="plans" title="Loading plans" />}>
      <PlansLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function PlansLoader({ searchParams }: PlansPageProps) {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });
  const resolvedSearchParams = await searchParams;

  let bootstrap: PlansBootstrap = EMPTY_PLANS_BOOTSTRAP;

  try {
    const { goals, deadlines, wishlist, dashboard } = await loadPlansPageBootstrapCached(user.id);
    bootstrap = {
      goals,
      deadlines,
      wishlist,
      disciplineSummary: dashboard.disciplineSummary,
      planIncomeContext: dashboard.planIncomeContext,
      accountBalance: dashboard.accountBalance,
    };
  } catch (error) {
    console.error('[plans-page] bootstrap failed', { userId: user.id, error });
  }

  const defaultTab = isValidPlansTab(resolvedSearchParams?.tab) ? resolvedSearchParams.tab : 'overview';

  return (
    <PlansPageClient bootstrap={bootstrap} userId={user.id} defaultTab={defaultTab} />
  );
}
