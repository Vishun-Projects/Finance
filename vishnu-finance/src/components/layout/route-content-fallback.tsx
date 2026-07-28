'use client';

import { usePathname } from 'next/navigation';
import { AppRouteLoader } from '@/components/feedback/app-route-loader';
import { getRouteLoaderTitle, getRouteLoaderVariant } from '@/lib/route-loader-variant';

/** Suspense fallback for app route segments — shows immediately on first load. */
export function RouteContentFallback() {
  const pathname = usePathname();
  const variant = getRouteLoaderVariant(pathname);
  const title = getRouteLoaderTitle(pathname);
  return <AppRouteLoader variant={variant} title={title} />;
}
