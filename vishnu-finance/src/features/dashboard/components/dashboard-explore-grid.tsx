'use client';

import { NavLink } from '@/components/layout/nav-link';
import { mobileExploreItems } from '@/lib/nav-config';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

interface DashboardExploreGridProps {
  className?: string;
}

export function DashboardExploreGrid({ className }: DashboardExploreGridProps) {
  return (
    <section className={cn(className)}>
      <h2 className="mb-3 px-0.5 text-xs font-medium uppercase tracking-wider text-hint">Explore</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {mobileExploreItems.map(({ href, label, icon: Icon }) => {
          const displayLabel = href === '/net-worth' ? 'Assets & debt' : label;
          return (
          <NavLink
            key={href}
            href={href}
            onClick={() => void hapticLight()}
            className="btn-touch flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-surface text-foreground">
              <Icon className="size-4" />
            </span>
            <span className="text-[9px] font-medium leading-tight text-muted-foreground">{displayLabel}</span>
          </NavLink>
        );})}
      </div>
    </section>
  );
}
