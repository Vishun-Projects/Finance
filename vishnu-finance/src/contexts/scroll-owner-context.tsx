'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';

interface ScrollOwnerContextValue {
  /** Register the page-level scroller (`main` on page-scroll routes). */
  registerPageScroller: (el: HTMLElement | null) => void;
  /** Register the active inner panel scroller (table-scroll routes). */
  registerPanelScroller: (el: HTMLElement | null) => void;
  /** Read scrollTop from whichever scroller is active. */
  getScrollTop: () => number;
}

const ScrollOwnerContext = createContext<ScrollOwnerContextValue | null>(null);

export function ScrollOwnerProvider({ children }: { children: React.ReactNode }) {
  const pageScrollerRef = useRef<HTMLElement | null>(null);
  const panelScrollerRef = useRef<HTMLElement | null>(null);

  const registerPageScroller = useCallback((el: HTMLElement | null) => {
    pageScrollerRef.current = el;
  }, []);

  const registerPanelScroller = useCallback((el: HTMLElement | null) => {
    panelScrollerRef.current = el;
  }, []);

  const getScrollTop = useCallback(() => {
    const panel = panelScrollerRef.current;
    if (panel) return panel.scrollTop;
    return pageScrollerRef.current?.scrollTop ?? 0;
  }, []);

  const value = useMemo(
    () => ({ registerPageScroller, registerPanelScroller, getScrollTop }),
    [registerPageScroller, registerPanelScroller, getScrollTop],
  );

  return (
    <ScrollOwnerContext.Provider value={value}>{children}</ScrollOwnerContext.Provider>
  );
}

export function useScrollOwner() {
  return useContext(ScrollOwnerContext);
}

export function useRegisterPageScroller(ref: React.RefObject<HTMLElement | null>) {
  const ctx = useScrollOwner();
  React.useEffect(() => {
    ctx?.registerPageScroller(ref.current);
    return () => ctx?.registerPageScroller(null);
  }, [ctx, ref, ref.current]);
}

export function useRegisterPanelScroller(ref: React.RefObject<HTMLElement | null>) {
  const ctx = useScrollOwner();
  React.useEffect(() => {
    ctx?.registerPanelScroller(ref.current);
    return () => ctx?.registerPanelScroller(null);
  }, [ctx, ref, ref.current]);
}
