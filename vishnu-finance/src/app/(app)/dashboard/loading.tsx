import { RouteLoadingState } from '@/components/feedback/route-fallbacks';

export default function DashboardLoading() {
  return (
    <RouteLoadingState
      title="Loading your dashboard"
      description="Syncing latest balances and transactions…"
      className="min-h-[400px]"
    />
  );
}
