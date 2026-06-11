'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { RoutePendingOverlay } from '@/components/layout/route-pending-overlay';
import { useScrollOwner } from '@/contexts/scroll-owner-context';
import { getRouteLayoutConfig } from '@/lib/layout-config';
import { cn } from '@/lib/utils';

/**
 * Pathname-driven scroll container — never use CSS :has() for scroll mode;
 * hidden cached routes must not flip main to table-scroll mode.
 */
export function MainScrollContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { scrollMode } = getRouteLayoutConfig(pathname);
  const isTableScroll = scrollMode === 'table';
  const mainRef = useRef<HTMLElement>(null);
  const scrollOwner = useScrollOwner();

  useEffect(() => {
    if (isTableScroll) {
      scrollOwner?.registerPageScroller(null);
      return;
    }
    scrollOwner?.registerPageScroller(mainRef.current);
    return () => scrollOwner?.registerPageScroller(null);
  }, [scrollOwner, isTableScroll, pathname]);

  return (
    <main
      ref={mainRef}
      data-scroll-mode={isTableScroll ? 'table' : 'page'}
      className={cn(
        'relative scrollbar-none flex min-h-0 flex-1 flex-col min-w-0 bg-background overflow-x-hidden',
        isTableScroll
          ? 'max-lg:overflow-hidden max-lg:pb-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:pb-0'
          : 'scroll-pb-bottom-bar overflow-y-auto max-lg:pb-[var(--app-bottom-inset)] lg:overflow-y-auto lg:pb-0',
      )}
    >
      <RoutePendingOverlay />
      {children}
    </main>
  );
}
