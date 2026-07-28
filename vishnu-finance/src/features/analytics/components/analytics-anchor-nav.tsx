'use client';

import { cn } from '@/lib/utils';

export interface AnalyticsAnchorItem {
  id: string;
  label: string;
}

function getPageScroller(): HTMLElement | null {
  return document.querySelector('main[data-scroll-mode]') as HTMLElement | null;
}

export function scrollAnalyticsSectionIntoView(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  const scroller = getPageScroller();
  const sticky = document.querySelector('[data-analytics-sticky]') as HTMLElement | null;
  const stickyOffset = (sticky?.offsetHeight ?? 0) + 12;

  if (scroller) {
    const scrollerRect = scroller.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const nextTop = scroller.scrollTop + (elRect.top - scrollerRect.top) - stickyOffset;
    scroller.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
  } else {
    const nextTop = window.scrollY + el.getBoundingClientRect().top - stickyOffset;
    window.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
  }

  window.history.replaceState(null, '', `#${id}`);
}

export default function AnalyticsAnchorNav({
  items,
  activeId,
}: {
  items: AnalyticsAnchorItem[];
  activeId: string;
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
      <div className="inline-flex min-w-full gap-0.5 border-b border-border/30 dark:border-border/45">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollAnalyticsSectionIntoView(item.id)}
            className={cn(
              '-mb-px h-9 shrink-0 border-b-2 px-3 text-xs font-medium transition-colors whitespace-nowrap',
              activeId === item.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
