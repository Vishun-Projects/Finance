import { RouteLoadingState } from '@/components/feedback/route-fallbacks';

export default function AuthRouteLoading() {
  return (
    <RouteLoadingState
      title="Loading authentication portal"
      description="Setting up secure sign-in experience…"
    />
  );
}


