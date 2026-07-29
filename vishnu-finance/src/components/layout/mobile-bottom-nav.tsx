'use client';

import { useRouter } from 'next/navigation';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/nav-config';
import { BottomNavLink } from '@/components/layout/bottom-nav-link';

interface MobileBottomNavProps {
  items: NavItem[];
  activeByHref: Set<string>;
}

export function MobileBottomNav({ items, activeByHref }: MobileBottomNavProps) {
  const router = useRouter();

  const prefetchTab = (href: string) => {
    // Intent-only: never storm heavy RSC bootstraps on mount while dashboard is loading
    void router.prefetch(href);
  };

  return (
    <nav
      className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm lg:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-[49px] w-full max-w-screen-sm items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeByHref.has(item.href);

          return (
            <BottomNavLink
              key={item.href}
              href={item.href}
              prefetch={false}
              linkClassName="flex min-w-0 flex-1"
              data-bottom-nav-active={isActive ? 'true' : 'false'}
              onClick={() => void hapticLight()}
              className={cn(
                'btn-touch flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors active:scale-[0.97]',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )}
              onPointerEnter={() => {
                if (!isActive) prefetchTab(item.href);
              }}
              onTouchStart={() => {
                if (!isActive) prefetchTab(item.href);
              }}
            >
              <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="max-w-full truncate">{item.label}</span>
            </BottomNavLink>
          );
        })}
      </div>
    </nav>
  );
}
