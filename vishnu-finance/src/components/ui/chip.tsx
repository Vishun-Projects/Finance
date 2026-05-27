import { chipVariants } from '@/design/variants';
import type { ChipVariant } from '@/design/tokens';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  variant?: ChipVariant;
  className?: string;
}

export function Chip({ children, variant = 'neutral', className }: ChipProps) {
  return (
    <span className={cn(chipVariants({ variant }), className)}>
      {children}
    </span>
  );
}
