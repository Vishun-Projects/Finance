'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { CategoryLegendItem } from '@/lib/dashboard-insights';

interface CategoryLegendProps {
  items: CategoryLegendItem[];
  className?: string;
}

export function CategoryLegend({ items, className }: CategoryLegendProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors active:bg-muted/40"
        >
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="min-w-0 flex-1 truncate text-xs text-foreground">{item.name}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted">{item.percent}%</span>
        </Link>
      ))}
    </div>
  );
}
