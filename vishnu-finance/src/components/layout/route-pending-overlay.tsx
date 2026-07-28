'use client';

import { usePathname } from 'next/navigation';
import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { useNavigationPending } from '@/contexts/navigation-pending-context';
import { getRouteLoaderTitle, getRouteLoaderVariant } from '@/lib/route-loader-variant';
import { cn } from '@/lib/utils';

function normalizePath(path: string): string {
  const base = path.split('?')[0]?.split('#')[0] ?? path;
  return base.endsWith('/') && base.length > 1 ? base.slice(0, -1) : base;
}

function isNavigatingTo(pathname: string, target: string): boolean {
  const current = normalizePath(pathname);
  const next = normalizePath(target);
  return next !== current && !current.startsWith(`${next}/`);
}

/**
 * Route transition feedback — progress bar immediately, skeleton after Doherty threshold.
 * Covers gaps when RSC `loading.tsx` is slow to appear (e.g. settings bootstrap).
 */
export function RoutePendingOverlay() {
  const pathname = usePathname();
  const { pendingHref } = useNavigationPending() ?? {};
  const isPending = Boolean(pendingHref && isNavigatingTo(pathname, pendingHref));

  if (!isPending || !pendingHref) return null;

  const showSkeleton = true;

  const variant = getRouteLoaderVariant(pendingHref);
  const title = getRouteLoaderTitle(pendingHref);

  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-40 h-1 overflow-hidden bg-primary/15"
        aria-hidden
      >
        <div className="h-full w-1/3 animate-[nav-progress_1s_ease-in-out_infinite] bg-primary" />
      </div>

      {showSkeleton ? (
        <div
          className={cn(
            'absolute inset-0 z-30 min-h-full bg-background',
            'animate-in fade-in duration-150',
          )}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <AppRouteLoader variant={variant} title={title} />
        </div>
      ) : null}
    </>
  );
}
