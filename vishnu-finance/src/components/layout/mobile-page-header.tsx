'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}

export default function MobilePageHeader({ title, subtitle, right, className }: MobilePageHeaderProps) {
  return (
    <div className={cn(patterns.mobilePageHeader, className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold leading-6">{title}</h2>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
      </div>
    </div>
  );
}
