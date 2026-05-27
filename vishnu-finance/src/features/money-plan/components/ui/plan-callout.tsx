import { Callout } from '@/components/ui/callout';
import type { CalloutVariant } from '@/design/tokens';
import type { ReactNode } from 'react';

const variantMap = {
  yellow: 'warning',
  orange: 'orange',
  red: 'danger',
  green: 'success',
  blue: 'info',
  purple: 'purple',
  neutral: 'neutral',
} as const satisfies Record<string, CalloutVariant>;

export type PlanCalloutVariant = keyof typeof variantMap;

interface PlanCalloutProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: PlanCalloutVariant;
  className?: string;
}

export function PlanCallout({
  title,
  children,
  icon,
  variant = 'yellow',
  className,
}: PlanCalloutProps) {
  return (
    <Callout
      title={title}
      icon={icon}
      variant={variantMap[variant]}
      className={className}
    >
      {children}
    </Callout>
  );
}
