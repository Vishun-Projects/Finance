'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/nav-config';
import { useSlidingIndicator } from '@/hooks/use-sliding-indicator';
import { BottomNavLink } from '@/components/layout/bottom-nav-link';

interface MobileBottomNavProps {
  items: NavItem[];
  activeByHref: Set<string>;
}

export function MobileBottomNav({ items, activeByHref }: MobileBottomNavProps) {
  const router = useRouter();
  const { containerRef, indicator, transition } = useSlidingIndicator(
    '[data-bottom-nav-active="true"]',
    [activeByHref, items],
  );

  useEffect(() => {
    for (const item of items) {
      void router.prefetch(item.href);
    }
  }, [items, router]);

  return (
    <nav className="safe-area-bottom pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-3 pb-2 lg:hidden">
      <div
        ref={containerRef}
        className="pointer-events-auto relative mx-auto flex h-14 w-full max-w-screen-sm items-stretch gap-0.5 rounded-[13px] p-1 glass-thin glass-text pb-[env(safe-area-inset-bottom)]"
      >
        {indicator.ready ? (
          <motion.div
            data-nav-indicator="true"
            aria-hidden
            className="pointer-events-none absolute top-1 bottom-1 z-0 rounded-[var(--radius-pill)] border border-accent bg-accent"
            initial={false}
            animate={{ left: indicator.left, width: indicator.width }}
            transition={transition}
          />
        ) : null}

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeByHref.has(item.href);

          return (
            <BottomNavLink
              key={item.href}
              href={item.href}
              data-bottom-nav-active={isActive ? 'true' : 'false'}
              onClick={() => void hapticLight()}
              className={cn(
                'btn-touch relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-pill)] px-1 transition-colors duration-200 active:scale-[0.97]',
                isActive ? 'text-[var(--primary-foreground)]' : 'text-muted hover:text-foreground',
              )}
            >
              <span className="flex size-8 items-center justify-center">
                <Icon className="size-5" />
              </span>
              <span className={cn('text-[10px] font-medium leading-none', isActive && 'font-semibold')}>
                {item.label}
              </span>
            </BottomNavLink>
          );
        })}
      </div>
    </nav>
  );
}
