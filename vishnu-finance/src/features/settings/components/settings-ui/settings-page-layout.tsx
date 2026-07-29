'use client';

import { cn } from '@/lib/utils';

export function SettingsPageLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-5 pb-6 lg:space-y-6 lg:pb-16', className)}>
      {children}
    </div>
  );
}
