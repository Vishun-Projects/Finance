import { navPillVariants } from '@/design/variants';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface NavPillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  className?: string;
}

export function NavPill({ label, active, onClick, icon, className }: NavPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(navPillVariants({ active }), className)}
    >
      {icon}
      {label}
    </button>
  );
}

interface NavPillGroupProps {
  children: ReactNode;
  className?: string;
}

export function NavPillGroup({ children, className }: NavPillGroupProps) {
  return (
    <div
      className={cn(
        'flex gap-0.5 overflow-x-auto rounded-md border border-border bg-card p-1',
        className
      )}
    >
      {children}
    </div>
  );
}
