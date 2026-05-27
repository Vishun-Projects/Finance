'use client';

import { usePathname } from 'next/navigation';
import { patterns } from '@/design/patterns';
import { cn } from '@/lib/utils';

export function AppPageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideMobileTopBar = pathname === '/dashboard';

  return (
    <div
      className={cn(
        patterns.pageShellMobile,
        hideMobileTopBar ? 'pt-4 lg:pt-8' : 'pt-14 lg:pt-8'
      )}
    >
      {children}
    </div>
  );
}
