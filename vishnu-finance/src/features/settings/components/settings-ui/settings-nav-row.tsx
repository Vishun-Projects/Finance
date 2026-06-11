'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';
import { hapticLight } from '@/lib/haptics';

export function SettingsNavRow({
  label,
  hint,
  value,
  onClick,
  bordered,
  destructive,
}: {
  label: string;
  hint?: string;
  value?: string;
  onClick?: () => void;
  bordered?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void hapticLight();
        onClick?.();
      }}
      className={cn(
        patterns.mobileCompactRow,
        'btn-touch flex w-full items-center gap-3 text-left transition-colors active:bg-surface',
        bordered && 'border-t border-border',
        destructive && 'text-destructive'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm font-medium', destructive ? 'text-destructive' : 'text-foreground')}>
          {label}
        </span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
      {value && <span className="shrink-0 text-xs text-muted-foreground">{value}</span>}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}
