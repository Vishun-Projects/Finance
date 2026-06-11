'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useIsNavigationPending } from '@/contexts/navigation-pending-context';

/**
 * Top progress bar during client navigations.
 * Main-area skeleton is handled by RoutePendingOverlay.
 */
export function NavigationLoadingListener() {
  const pathname = usePathname();
  const linkPending = useIsNavigationPending();
  const [clickActive, setClickActive] = useState(false);
  const prevPath = useRef(pathname);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = clickActive || linkPending;

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setClickActive(false), 120);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor?.href) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (url.pathname === pathname && !url.search) return;

      setClickActive(true);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-transparent"
      aria-hidden
    >
      <div
        className={cn(
          'h-full w-1/3 bg-primary',
          'animate-[nav-progress_1s_ease-in-out_infinite]',
        )}
      />
    </div>
  );
}
