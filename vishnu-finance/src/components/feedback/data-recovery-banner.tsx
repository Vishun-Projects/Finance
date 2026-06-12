'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DataRecoveryBannerProps {
  message?: string;
  onRetry: () => void;
  loading?: boolean;
  className?: string;
}

export function DataRecoveryBanner({
  message = 'Some data failed to load. Retry to fetch the latest from your account.',
  onRetry,
  loading = false,
  className,
}: DataRecoveryBannerProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-2 text-sm text-foreground">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
        <p>{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={loading} className="shrink-0 gap-1.5">
        <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
        Retry
      </Button>
    </div>
  );
}
