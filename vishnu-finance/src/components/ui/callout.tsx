import { calloutVariants } from '@/design/variants';
import type { CalloutVariant } from '@/design/tokens';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CalloutProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: CalloutVariant;
  className?: string;
}

export function Callout({
  title,
  children,
  icon,
  variant = 'warning',
  className,
}: CalloutProps) {
  return (
    <div className={cn(calloutVariants({ variant }), className)}>
      <div className="flex items-start gap-2">
        {icon && <span className="callout-body mt-0.5 shrink-0">{icon}</span>}
        <div>
          <div className="callout-title text-xs font-medium">{title}</div>
          <div className="callout-body mt-1 text-xs leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}
