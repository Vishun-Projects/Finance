import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CompareGridProps {
  children: ReactNode;
  className?: string;
}

export function CompareGrid({ children, className }: CompareGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-2.5 sm:grid-cols-2', className)}>
      {children}
    </div>
  );
}

interface CompareColumnProps {
  title: string;
  children: ReactNode;
  variant?: 'success' | 'danger' | 'neutral';
  className?: string;
}

export function CompareColumn({
  title,
  children,
  variant = 'neutral',
  className,
}: CompareColumnProps) {
  const titleClass =
    variant === 'success'
      ? 'text-[var(--success)]'
      : variant === 'danger'
        ? 'text-[var(--danger)]'
        : 'text-muted';

  return (
    <div className={cn('rounded-md border border-border bg-card px-4 py-3', className)}>
      <div className={cn('mb-2 text-xs font-medium', titleClass)}>{title}</div>
      <div className="space-y-1.5 text-xs text-muted">{children}</div>
    </div>
  );
}
