import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function PlanCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card-base p-3.5 sm:p-4', className)} {...props}>
      {children}
    </div>
  );
}
