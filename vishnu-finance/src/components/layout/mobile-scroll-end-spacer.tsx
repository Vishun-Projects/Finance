'use client';

import { useIsMobile } from '@/hooks/use-breakpoint';

/** Extra scroll clearance at page end so last content clears the floating bottom nav. */
export function MobileScrollEndSpacer() {
  const isMobile = useIsMobile('lg');
  if (!isMobile) return null;

  return (
    <div
      className="pointer-events-none shrink-0 lg:hidden"
      style={{ height: 'var(--app-scroll-end-gap)' }}
      aria-hidden
    />
  );
}
