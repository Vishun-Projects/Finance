'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

const THEMES = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
];

export function SettingsThemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (theme: 'light' | 'dark' | 'system') => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
      {THEMES.map((theme) => {
        const Icon = theme.icon;
        const active = value === theme.value;
        return (
          <button
            key={theme.value}
            type="button"
            onClick={() => {
              void hapticLight();
              onChange(theme.value);
            }}
            className={cn(
              'btn-touch flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-2.5 text-xs font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            {theme.label}
          </button>
        );
      })}
    </div>
  );
}
