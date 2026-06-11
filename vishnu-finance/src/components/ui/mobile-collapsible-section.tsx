'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';
import { Button } from '@/components/ui/button';

interface MobileCollapsibleSectionProps {
  title: string;
  summary?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function MobileCollapsibleSection({
  title,
  summary,
  children,
  defaultOpen = false,
  className,
}: MobileCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('card-base overflow-hidden', className)}>
      <button
        type="button"
        className={cn(
          'flex w-full items-center justify-between gap-3 px-4 py-3 text-left lg:hidden',
          patterns.touchTarget
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {summary && !open && <div className="mt-0.5 text-xs text-muted">{summary}</div>}
        </div>
        <ChevronDown className={cn('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      <div className={cn('hidden lg:block')}>{children}</div>
      <div className={cn('lg:hidden', open ? 'block border-t border-border' : 'hidden')}>{children}</div>
    </div>
  );
}

interface MobileExpandTriggerProps {
  label: string;
  expandedLabel?: string;
  open: boolean;
  onToggle: () => void;
  className?: string;
}

export function MobileExpandTrigger({ label, expandedLabel, open, onToggle, className }: MobileExpandTriggerProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('h-8 w-full text-xs lg:hidden', className)}
      onClick={onToggle}
    >
      {open ? (expandedLabel ?? 'Show less') : label}
    </Button>
  );
}
