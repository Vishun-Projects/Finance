import { sectionLabelVariants } from '@/design/variants';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return <div className={cn(sectionLabelVariants(), className)}>{children}</div>;
}
