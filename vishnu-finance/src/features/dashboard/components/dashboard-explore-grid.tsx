'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink } from '@/components/layout/nav-link';
import { mobileExploreItems } from '@/lib/nav-config';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

interface DashboardExploreGridProps {
  className?: string;
}

export function DashboardExploreGrid({ className }: DashboardExploreGridProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const hasOverflow = maxScroll > 4;
    setCanScrollLeft(hasOverflow && el.scrollLeft > 4);
    setCanScrollRight(hasOverflow && el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scrollByPage = (direction: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    void hapticLight();
    const amount = Math.max(el.clientWidth * 0.7, 160);
    el.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <section className={cn(className)}>
      <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-hint">Explore</h2>
        {canScrollRight || canScrollLeft ? (
          <span className="text-[10px] text-muted">
            {canScrollRight ? 'Swipe or tap →' : 'Tap ← for more'}
          </span>
        ) : null}
      </div>
      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto pb-2 pe-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {mobileExploreItems.map(({ href, label, icon: Icon }) => {
            const displayLabel = href === '/net-worth' ? 'Assets & debt' : label;
            return (
              <NavLink
                key={href}
                href={href}
                prefetch={false}
                onClick={() => void hapticLight()}
                className="btn-touch flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 text-center"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-surface text-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="w-full text-[9px] font-medium leading-tight text-muted-foreground line-clamp-2">
                  {displayLabel}
                </span>
              </NavLink>
            );
          })}
        </div>

        {canScrollLeft ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent"
            />
            <button
              type="button"
              onClick={() => scrollByPage('left')}
              className="btn-touch absolute inset-y-0 left-0 z-10 flex w-9 items-center justify-start pl-0.5"
              aria-label="Show previous explore options"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-sm">
                <ChevronLeft className="size-4" />
              </span>
            </button>
          </>
        ) : null}

        {canScrollRight ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent"
            />
            <button
              type="button"
              onClick={() => scrollByPage('right')}
              className="btn-touch absolute inset-y-0 right-0 z-10 flex w-9 items-center justify-end pr-0.5"
              aria-label="Show more explore options"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-sm">
                <ChevronRight className="size-4" />
              </span>
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
