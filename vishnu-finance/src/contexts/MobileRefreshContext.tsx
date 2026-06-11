'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type RefreshHandler = () => void | Promise<void>;

interface MobileRefreshContextValue {
  registerRefresh: (handler: RefreshHandler | null) => void;
  onRefresh: () => Promise<void>;
  hasRefreshHandler: boolean;
}

const MobileRefreshContext = createContext<MobileRefreshContextValue | null>(null);

export function MobileRefreshProvider({ children }: { children: React.ReactNode }) {
  const [handler, setHandler] = useState<RefreshHandler | null>(null);

  const registerRefresh = useCallback((next: RefreshHandler | null) => {
    setHandler(() => next);
  }, []);

  const onRefresh = useCallback(async () => {
    if (handler) await handler();
  }, [handler]);

  const value = useMemo(
    () => ({
      registerRefresh,
      onRefresh,
      hasRefreshHandler: handler != null,
    }),
    [registerRefresh, onRefresh, handler],
  );

  return (
    <MobileRefreshContext.Provider value={value}>{children}</MobileRefreshContext.Provider>
  );
}

/**
 * Register pull-to-refresh only while this route is active.
 * Prevents hidden/stale handlers from other pages firing on the wrong screen.
 */
export function useMobileRefreshRegister(
  handler: RefreshHandler | null,
  routePrefix: string,
) {
  const ctx = useContext(MobileRefreshContext);
  const pathname = usePathname();
  const isActive =
    pathname === routePrefix || pathname.startsWith(`${routePrefix}/`);

  React.useEffect(() => {
    if (!isActive) return;
    ctx?.registerRefresh(handler);
    return () => ctx?.registerRefresh(null);
  }, [ctx, handler, isActive]);
}

export function useMobileRefresh() {
  return useContext(MobileRefreshContext);
}
