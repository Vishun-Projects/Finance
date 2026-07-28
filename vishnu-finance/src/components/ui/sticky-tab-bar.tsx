'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StickyTabBarProps {
  children: ReactNode;
  className?: string;
  /** When true, sits under the global mobile top bar. When false, sticks to top of the scrollport. */
  underGlobalTopBar?: boolean;
  /** Keep sticky on large screens too (default: unlock on lg) */
  stickyOnDesktop?: boolean;
  /** Use glass chrome material instead of flat backdrop blur */
  glass?: boolean;
}

/** Shared sticky strip for section/mode tabs — header content scrolls away above this. */
export function StickyTabBar({
  children,
  className,
  underGlobalTopBar = true,
  stickyOnDesktop = false,
  glass = false,
}: StickyTabBarProps) {
  return (
    <div
      className={cn(
        'sticky z-40 -mx-4 isolate px-4',
        glass
          ? 'glass-chrome glass-chrome-text rounded-none border-x-0 border-t-0'
          : 'bg-background/95 backdrop-blur-md',
        underGlobalTopBar
          ? stickyOnDesktop
            ? 'top-[calc(3rem+env(safe-area-inset-top))] lg:top-0'
            : 'top-[calc(3rem+env(safe-area-inset-top))]'
          : 'top-0',
        stickyOnDesktop
          ? null
          : 'lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:shadow-none lg:backdrop-blur-none',
        className,
      )}
    >
      {children}
    </div>
  );
}
