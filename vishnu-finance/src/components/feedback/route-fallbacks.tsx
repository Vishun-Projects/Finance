import React from 'react';
import { cn } from '@/lib/utils';

interface RouteLoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

import { Skeleton } from "@/components/ui/skeleton";

export function RouteLoadingState({
  title = 'Loading...',
  description,
  className,
  children,
}: RouteLoadingStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[40vh] flex-col items-center justify-center gap-6 text-center w-full max-w-md mx-auto p-6',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="space-y-4 w-full flex flex-col items-center">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        {description && <Skeleton className="h-4 w-1/2 rounded-lg opacity-70" />}
      </div>

      {/* Real text for screen readers/fallback if needed, but visually skeleton is dominant */}
      <div className="sr-only">
        <p>{title}</p>
        <p>{description}</p>
      </div>

      {children}
    </div>
  );
}


