import type { PlansBootstrap } from '@/features/plans/components/plans-page';
import type { DashboardBootstrap } from '@/features/dashboard/types';

export function isPlansBootstrapEmpty(b: PlansBootstrap): boolean {
  return (
    (b.goals?.length ?? 0) === 0 &&
    (b.deadlines?.data?.length ?? 0) === 0 &&
    (b.wishlist?.data?.length ?? 0) === 0
  );
}

export function isDashboardBootstrapEmpty(b: DashboardBootstrap): boolean {
  const stats = b.stats?.currentMonthStats;
  const hasActivity =
    (stats?.income ?? 0) !== 0 ||
    (stats?.expenses ?? 0) !== 0 ||
    (b.stats?.recentTransactions?.length ?? 0) > 0 ||
    (b.adherence?.goals?.length ?? 0) > 0;
  return !hasActivity && (b.adherence?.buckets?.length ?? 0) === 0;
}
