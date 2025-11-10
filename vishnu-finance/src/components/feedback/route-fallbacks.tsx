import React from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './loading-spinner';

interface RouteLoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function RouteLoadingState({
  title = 'Loading...',
  description,
  className,
  children,
}: RouteLoadingStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="lg" />
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}


