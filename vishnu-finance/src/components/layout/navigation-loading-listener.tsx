'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useNavigationPending } from '@/contexts/navigation-pending-context';

/**
 * Registers navigation pending for any same-origin link click (capture phase).
 * Works with NavLink and plain next/link — feeds RoutePendingOverlay.
 */
export function NavigationLoadingListener() {
  const pathname = usePathname();
  const navigationPending = useNavigationPending();

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

      navigationPending?.registerPending(url.pathname, true);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname, navigationPending]);

  return null;
}
