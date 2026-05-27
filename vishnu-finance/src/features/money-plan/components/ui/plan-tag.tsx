import { Chip } from '@/components/ui/chip';
import type { ChipVariant } from '@/design/tokens';
import type { ReactNode } from 'react';

const colorMap = {
  red: 'danger',
  green: 'success',
  yellow: 'warning',
  blue: 'info',
  purple: 'purple',
  orange: 'orange',
} as const satisfies Record<string, ChipVariant>;

export type PlanTagColor = keyof typeof colorMap;

interface PlanTagProps {
  children: ReactNode;
  color?: PlanTagColor;
  className?: string;
}

export function PlanTag({ children, color = 'blue', className }: PlanTagProps) {
  return (
    <Chip variant={colorMap[color]} className={className}>
      {children}
    </Chip>
  );
}
