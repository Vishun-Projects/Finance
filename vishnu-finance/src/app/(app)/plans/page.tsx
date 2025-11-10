import { Suspense } from 'react';
import { requireUser } from '@/lib/auth/server-auth';
import { RouteLoadingState } from '@/components/feedback/route-fallbacks';
import { loadGoals } from '@/lib/loaders/goals';
import { loadDeadlines } from '@/lib/loaders/deadlines';
import { loadWishlist } from '@/lib/loaders/wishlist';
import PlansPageClient, { PlansBootstrap } from './page-client';

const ALLOWED_TABS = ['goals', 'deadlines', 'wishlist'] as const;
type PlansTab = (typeof ALLOWED_TABS)[number];

function isValidPlansTab(tab?: string): tab is PlansTab {
  return Boolean(tab && ALLOWED_TABS.includes(tab as PlansTab));
}

interface PlansPageProps {
  searchParams?: { tab?: string };
}

export const dynamic = 'force-dynamic';

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const user = await requireUser({ redirectTo: '/auth?tab=login' });

  const [goals, deadlines, wishlist] = await Promise.all([
    loadGoals(user.id),
    loadDeadlines(user.id),
    loadWishlist(user.id),
  ]);

  const bootstrap: PlansBootstrap = {
    goals,
    deadlines,
    wishlist,
  };

  const defaultTab = isValidPlansTab(searchParams?.tab) ? searchParams!.tab : 'goals';

  return (
    <Suspense
      fallback={
        <RouteLoadingState
          title="Loading plans"
          description="Collecting your goals, deadlines, and wishlist items…"
          className="min-h-[50vh]"
        />
      }
    >
      <PlansPageClient bootstrap={bootstrap} userId={user.id} defaultTab={defaultTab} />
    </Suspense>
  );
}
