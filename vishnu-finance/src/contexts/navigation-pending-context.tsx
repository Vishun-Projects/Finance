'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

interface NavigationPendingContextValue {
  registerPending: (href: string, pending: boolean) => void;
  pendingHref: string | null;
}

const NavigationPendingContext = createContext<NavigationPendingContextValue | null>(null);

export function NavigationPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pendingCounts = useRef(new Map<string, number>());

  const registerPending = useCallback((href: string, pending: boolean) => {
    const counts = pendingCounts.current;
    const prev = counts.get(href) ?? 0;
    const next = pending ? prev + 1 : Math.max(0, prev - 1);

    if (next === 0) {
      counts.delete(href);
    } else {
      counts.set(href, next);
    }

    const active = [...counts.keys()].at(-1) ?? null;
    setPendingHref(active);
  }, []);

  useEffect(() => {
    setPendingHref(null);
    pendingCounts.current.clear();
  }, [pathname]);

  const value = useMemo(
    () => ({ registerPending, pendingHref }),
    [registerPending, pendingHref],
  );

  return (
    <NavigationPendingContext.Provider value={value}>
      {children}
    </NavigationPendingContext.Provider>
  );
}

export function useNavigationPending() {
  return useContext(NavigationPendingContext);
}

export function useIsNavigationPending(): boolean {
  const ctx = useNavigationPending();
  const pathname = usePathname();
  if (!ctx?.pendingHref) return false;
  return ctx.pendingHref !== pathname && !pathname.startsWith(`${ctx.pendingHref}/`);
}
