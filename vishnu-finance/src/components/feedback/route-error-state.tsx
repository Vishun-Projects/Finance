'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface RouteErrorStateProps {
  title?: string;
  description?: string;
  retryHref?: string;
  supportHref?: string;
  className?: string;
  children?: React.ReactNode;
}

export function RouteErrorState({
  title = 'Something went wrong',
  description = 'We could not load this page. Please try again shortly.',
  retryHref,
  supportHref,
  className,
  children,
}: RouteErrorStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center',
        className,
      )}
      role="alert"
    >
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        {retryHref ? (
          <a
            href={retryHref}
            className="rounded-md border border-border bg-card px-3 py-1.5 font-medium text-foreground shadow-sm transition hover:bg-muted"
          >
            Try again
          </a>
        ) : null}
        {supportHref ? (
          <a
            href={supportHref}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Contact support
          </a>
        ) : null}
      </div>
      {children}
    </div>
  );
}


