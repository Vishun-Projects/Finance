'use client';

import { useEffect } from 'react';
import { RouteErrorState } from '@/components/feedback/route-error-state';

export default function FinancialHealthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[financial-health-error]', error);
  }, [error]);

  return (
    <RouteErrorState
      title="Financial health failed to load"
      description="We couldn't retrieve your health summary. Please try again."
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
