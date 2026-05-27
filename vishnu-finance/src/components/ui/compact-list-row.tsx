'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';

interface CompactListRowProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
}

export function CompactListRow({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  className,
  iconClassName,
}: CompactListRowProps) {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        patterns.mobileCompactRow,
        'flex w-full items-center gap-3 text-left transition-colors',
        onClick && 'active:bg-muted/40',
        className
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface',
          iconClassName
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted">{subtitle}</div>}
      </div>
      {trailing && <div className="shrink-0 text-right text-xs tabular-nums">{trailing}</div>}
    </Comp>
  );
}
