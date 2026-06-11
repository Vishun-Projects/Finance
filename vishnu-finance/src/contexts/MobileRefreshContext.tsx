'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type RefreshHandler = () => void | Promise<void>;

interface MobileRefreshContextValue {
  registerRefresh: (handler: RefreshHandler | null) => void;
  onRefresh: () => Promise<void>;
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
    () => ({ registerRefresh, onRefresh }),
    [registerRefresh, onRefresh]
  );

  return (
    <MobileRefreshContext.Provider value={value}>{children}</MobileRefreshContext.Provider>
  );
}

export function useMobileRefreshRegister(handler: RefreshHandler | null) {
  const ctx = useContext(MobileRefreshContext);
  React.useEffect(() => {
    ctx?.registerRefresh(handler);
    return () => ctx?.registerRefresh(null);
  }, [ctx, handler]);
}

export function useMobileRefresh() {
  return useContext(MobileRefreshContext);
}
