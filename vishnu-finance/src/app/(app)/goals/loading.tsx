import { RouteLoadingState } from '@/components/feedback/route-fallbacks';

export default function GoalsLoading() {
  return (
    <RouteLoadingState
      title="Loading goals"
      description="Preparing your financial goals dashboard…"
      className="min-h-[50vh]"
    />
  );
}
