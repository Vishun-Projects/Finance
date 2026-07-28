import { patterns } from '@/design/patterns';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Constrained desktop content column — full width on mobile. */
export function DesktopPageColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-full lg:mx-auto lg:max-w-[var(--page-max-width)]', className)}>
      {children}
    </div>
  );
}
