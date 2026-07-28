'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';
import { StickyTabBar } from '@/components/ui/sticky-tab-bar';

export interface MobileStickyTab {
  id: string;
  label: string;
  shortLabel?: string;
}

interface MobileStickyTabsProps {
  tabs: MobileStickyTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  /** Wrap in sticky strip (default true) */
  sticky?: boolean;
  underGlobalTopBar?: boolean;
  /** Keep sticky + chrome on desktop */
  stickyOnDesktop?: boolean;
  /** Glass chrome sticky strip */
  glass?: boolean;
  /** Optional trailing actions inside sticky strip (e.g. History) */
  trailing?: ReactNode;
}

/** Underline tab strip — Analytics / Dashboard chrome language */
export function MobileStickyTabs({
  tabs,
  activeId,
  onChange,
  className,
  sticky = true,
  underGlobalTopBar = true,
  stickyOnDesktop = false,
  glass = false,
  trailing,
}: MobileStickyTabsProps) {
  const strip = (
    <div className={cn('flex items-end gap-2', !sticky && className)}>
      <div className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 scrollbar-none">
        <div className="inline-flex min-w-full gap-0.5 border-b border-border/40 dark:border-border/55">
          {tabs.map((tab) => {
            const isActive = tab.id === activeId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  void hapticLight();
                  onChange(tab.id);
                }}
                className={cn(
                  '-mb-px h-9 shrink-0 border-b-2 px-3 text-xs font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-foreground',
                )}
              >
                {tab.shortLabel ?? tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {trailing ? <div className="mb-1 flex shrink-0 items-center gap-1.5">{trailing}</div> : null}
    </div>
  );

  if (!sticky) return strip;

  return (
    <StickyTabBar
      underGlobalTopBar={underGlobalTopBar}
      stickyOnDesktop={stickyOnDesktop}
      glass={glass}
      className={cn('pb-0', className)}
    >
      {strip}
    </StickyTabBar>
  );
}
