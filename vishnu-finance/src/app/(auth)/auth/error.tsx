'use client';

import { useEffect } from 'react';
import { RouteErrorState } from '@/components/feedback/route-error-state';

export default function AuthRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[auth-route-error]', error);
  }, [error]);

  return (
    <RouteErrorState
      title="Authentication portal unavailable"
      description="We hit a snag while loading the auth experience. Please retry."
    >
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-border bg-card px-3 py-1.5 font-medium text-foreground shadow-sm transition hover:bg-muted"
      >
        Retry
      </button>
    </RouteErrorState>
  );
}


