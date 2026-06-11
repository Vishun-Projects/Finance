'use client';

import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';

export function SettingsRow({
  label,
  hint,
  children,
  className,
  bordered,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={cn(
        patterns.mobileCompactRow,
        'flex items-center justify-between gap-3',
        bordered && 'border-t border-border',
        className
      )}
    >
      {(label || hint) && (
        <div className="min-w-0 flex-1">
          {label && <p className="text-sm font-medium text-foreground">{label}</p>}
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      )}
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsFieldGroup({
  children,
  className,
  bordered,
}: {
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={cn(
        'space-y-4 px-4 py-4',
        bordered && 'border-t border-border',
        className
      )}
    >
      {children}
    </div>
  );
}
