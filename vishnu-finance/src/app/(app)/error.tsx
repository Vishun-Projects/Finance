'use client';

import { useEffect } from 'react';
import { RouteErrorState } from '@/components/feedback/route-error-state';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app-error]', error);
  }, [error]);

  return (
    <RouteErrorState
      title="This page failed to load"
      description="Something went wrong while loading your data. Please try again."
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
