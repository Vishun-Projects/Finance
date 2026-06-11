'use client';

import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { useNavigationPending } from '@/contexts/navigation-pending-context';
import { getRouteLoaderVariant } from '@/lib/route-loader-variant';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function RoutePendingOverlay() {
  const pathname = usePathname();
  const { pendingHref } = useNavigationPending() ?? {};

  const showOverlay =
    pendingHref !== null &&
    pendingHref !== undefined &&
    pendingHref !== pathname &&
    !pathname.startsWith(`${pendingHref}/`);

  if (!showOverlay || !pendingHref) return null;

  const variant = getRouteLoaderVariant(pendingHref);

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 z-30 overflow-hidden bg-background')}
      aria-hidden
    >
      <AppRouteLoader variant={variant} title="Loading page" />
    </div>
  );
}
