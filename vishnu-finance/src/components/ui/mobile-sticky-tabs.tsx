'use client';

import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';
import { hapticLight } from '@/lib/haptics';

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
}

export function MobileStickyTabs({ tabs, activeId, onChange, className }: MobileStickyTabsProps) {
  return (
    <div
      className={cn(
        patterns.mobilePageHeader,
        'top-[calc(3rem+env(safe-area-inset-top))] -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:hidden',
        className
      )}
    >
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
              'btn-touch shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'glass-chip glass-text text-muted-foreground'
            )}
          >
            {tab.shortLabel ?? tab.label}
          </button>
        );
      })}
    </div>
  );
}
