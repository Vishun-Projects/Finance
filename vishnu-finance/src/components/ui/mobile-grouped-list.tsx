'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';
import { hapticLight } from '@/lib/haptics';

export interface MobileGroupedListItem {
  id: string;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  destructive?: boolean;
}

export interface MobileGroupedListSection {
  title?: string;
  items: MobileGroupedListItem[];
}

interface MobileGroupedListProps {
  sections: MobileGroupedListSection[];
  className?: string;
}

export function MobileGroupedList({ sections, className }: MobileGroupedListProps) {
  return (
    <div className={cn('space-y-6 lg:hidden', className)}>
      {sections.map((section) => (
        <div key={section.title ?? section.items[0]?.id}>
          {section.title && (
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-hint">
              {section.title}
            </p>
          )}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {section.items.map((item, index) => {
              const content = (
                <>
                  {item.icon && (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-foreground">
                      {item.icon}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-sm font-medium',
                        item.destructive ? 'text-destructive' : 'text-foreground'
                      )}
                    >
                      {item.label}
                    </span>
                    {item.description && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </span>
                  {item.trailing ?? (
                    (item.href || item.onClick) && (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    )
                  )}
                </>
              );

              const rowClass = cn(
                patterns.mobileCompactRow,
                'btn-touch flex w-full items-center gap-3 text-left transition-colors active:bg-surface',
                index > 0 && 'border-t border-border',
                item.destructive && 'text-destructive'
              );

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={rowClass}
                    onClick={() => void hapticLight()}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  className={rowClass}
                  onClick={() => {
                    void hapticLight();
                    item.onClick?.();
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
