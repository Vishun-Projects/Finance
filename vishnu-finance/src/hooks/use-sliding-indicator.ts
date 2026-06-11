'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion-utils';

export interface SlidingIndicatorRect {
  left: number;
  width: number;
  top?: number;
  height?: number;
  ready: boolean;
}

export function useSlidingIndicator(
  activeSelector: string,
  deps: unknown[] = [],
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<SlidingIndicatorRect>({
    left: 0,
    width: 0,
    ready: false,
  });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const active = container.querySelector<HTMLElement>(activeSelector);
    if (!active) {
      setIndicator((prev) => ({ ...prev, ready: false }));
      return;
    }

    setIndicator({
      left: active.offsetLeft,
      width: active.offsetWidth,
      top: active.offsetTop,
      height: active.offsetHeight,
      ready: true,
    });
  }, [activeSelector]);

  useLayoutEffect(() => {
    updateIndicator();

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => updateIndicator());
    ro.observe(container);
    for (const child of container.children) {
      if (child instanceof HTMLElement && !child.dataset.navIndicator) {
        ro.observe(child);
      }
    }

    return () => ro.disconnect();
  }, [updateIndicator, ...deps]);

  const reducedMotion = prefersReducedMotion();
  const transition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 36, mass: 0.85 };

  return { containerRef, indicator, updateIndicator, transition };
}
