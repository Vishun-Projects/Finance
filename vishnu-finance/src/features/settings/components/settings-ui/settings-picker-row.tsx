'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';

type SettingsPickerRowProps = {
  label: string;
  hint?: string;
  value: string;
  bordered?: boolean;
  className?: string;
  trigger: React.ReactNode;
};

export function SettingsPickerRow({
  label,
  hint,
  value,
  bordered,
  className,
  trigger,
}: SettingsPickerRowProps) {
  return (
    <div
      className={cn(
        'relative',
        bordered && 'border-t border-border',
        className
      )}
    >
      <div
        className={cn(
          patterns.mobileCompactRow,
          'pointer-events-none flex items-center justify-between gap-3'
        )}
      >
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="max-w-[10rem] truncate text-sm text-muted-foreground">{value}</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      </div>
      <div className="absolute inset-0 [&_button]:size-full [&_button]:opacity-0">{trigger}</div>
    </div>
  );
}
