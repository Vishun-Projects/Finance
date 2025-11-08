'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}

export default function MobileHeader({ title, subtitle, right, className }: MobileHeaderProps) {
  return (
    <div className={cn('sticky top-0 z-30 md:hidden bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 py-3 safe-top', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-6">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}


