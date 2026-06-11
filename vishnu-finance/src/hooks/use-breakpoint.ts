'use client';

import { useSyncExternalStore } from 'react';

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

function getBreakpointQuery(breakpoint: Breakpoint) {
  return `(min-width: ${BREAKPOINTS[breakpoint]}px)`;
}

function subscribeMediaQuery(query: string, callback: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getMediaQuerySnapshot(query: string) {
  return window.matchMedia(query).matches;
}

export function useBreakpoint(breakpoint: Breakpoint = 'lg') {
  const query = getBreakpointQuery(breakpoint);

  return useSyncExternalStore(
    (callback) => subscribeMediaQuery(query, callback),
    () => getMediaQuerySnapshot(query),
    () => false
  );
}

export function useIsMobile(breakpoint: Breakpoint = 'lg') {
  const isAtLeast = useBreakpoint(breakpoint);
  return !isAtLeast;
}

export function useIsDesktopNav() {
  return useBreakpoint('lg');
}
