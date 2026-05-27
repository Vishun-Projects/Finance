'use client';

import { useEffect, useState } from 'react';

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

export function useBreakpoint(breakpoint: Breakpoint = 'md') {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(getBreakpointQuery(breakpoint));

    const update = () => setMatches(query.matches);
    update();

    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [breakpoint]);

  return matches;
}

export function useIsMobile(breakpoint: Breakpoint = 'md') {
  const isAtLeast = useBreakpoint(breakpoint);
  return !isAtLeast;
}

export function useIsDesktopNav() {
  return useBreakpoint('lg');
}
