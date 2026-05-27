import { listRowVariants, listVariants } from '@/design/variants';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ListProps {
  children: ReactNode;
  className?: string;
}

export function List({ children, className }: ListProps) {
  return <div className={cn(listVariants(), className)}>{children}</div>;
}

interface ListRowProps {
  children: ReactNode;
  className?: string;
}

export function ListRow({ children, className }: ListRowProps) {
  return <div className={cn(listRowVariants(), className)}>{children}</div>;
}
