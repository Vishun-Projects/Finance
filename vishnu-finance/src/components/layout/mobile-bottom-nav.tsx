'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion-utils';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/nav-config';

interface MobileBottomNavProps {
  items: NavItem[];
  activeByHref: Set<string>;
}

export function MobileBottomNav({ items, activeByHref }: MobileBottomNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    ready: false,
  });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const active = container.querySelector<HTMLElement>('[data-bottom-nav-active="true"]');
    const icon = active?.querySelector<HTMLElement>('[data-bottom-nav-icon]');
    if (!active || !icon) {
      setIndicator((prev) => ({ ...prev, ready: false }));
      return;
    }

    setIndicator({
      left: active.offsetLeft + icon.offsetLeft,
      top: active.offsetTop + icon.offsetTop,
      width: icon.offsetWidth,
      height: icon.offsetHeight,
      ready: true,
    });
  }, []);

  useLayoutEffect(() => {
    updateIndicator();

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => updateIndicator());
    ro.observe(container);
    for (const child of container.children) {
      if (child instanceof HTMLElement && child.dataset.bottomNavIndicator !== 'true') {
        ro.observe(child);
      }
    }

    return () => ro.disconnect();
  }, [updateIndicator, activeByHref, items]);

  const reducedMotion = prefersReducedMotion();
  const transition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 36, mass: 0.85 };

  return (
    <nav className="safe-area-bottom pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-3 pb-2 lg:hidden">
      <div
        ref={containerRef}
        className="pointer-events-auto relative mx-auto flex h-14 w-full max-w-screen-sm items-center justify-around gap-0.5 rounded-full glass-thin glass-text px-1 pb-[env(safe-area-inset-bottom)]"
      >
        {indicator.ready ? (
          <motion.div
            data-bottom-nav-indicator="true"
            aria-hidden
            className="pointer-events-none absolute z-0 rounded-full bg-foreground/10"
            initial={false}
            animate={{
              left: indicator.left,
              top: indicator.top,
              width: indicator.width,
              height: indicator.height,
            }}
            transition={transition}
          />
        ) : null}

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeByHref.has(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              data-bottom-nav-active={isActive ? 'true' : 'false'}
              onClick={() => void hapticLight()}
              className={cn(
                'btn-touch relative z-10 flex h-full flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-200 active:scale-95',
                isActive ? 'text-foreground' : 'text-muted hover:text-foreground',
              )}
            >
              <span
                data-bottom-nav-icon
                className="flex size-9 items-center justify-center rounded-full"
              >
                <Icon className="size-5" />
              </span>
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
