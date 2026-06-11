'use client';

import { usePathname } from 'next/navigation';
import { patterns } from '@/design/patterns';
import { cn } from '@/lib/utils';
import { MobileScreenShell } from '@/components/layout/mobile-screen-shell';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { MobileRefreshProvider, useMobileRefresh } from '@/contexts/MobileRefreshContext';

function AppPageShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile('lg');
  const isFullBleed = pathname === '/advisor';
  const noTopOffset = pathname === '/dashboard' || pathname === '/advisor' || pathname === '/plans';
  const fillViewport = pathname === '/dashboard' || pathname === '/plans' || pathname === '/advisor';
  const { onRefresh } = useMobileRefresh() ?? {};

  if (isMobile) {
    return (
      <MobileScreenShell
        fullBleed={isFullBleed}
        noTopOffset={noTopOffset}
        fillViewport={fillViewport}
        onRefresh={onRefresh}
      >
        {children}
      </MobileScreenShell>
    );
  }

  return (
    <div className={cn('flex min-h-full flex-col', patterns.desktopContentShell, patterns.pageShellMobile, 'pt-4 lg:pt-8')}>
      {children}
    </div>
  );
}

export function AppPageShell({ children }: { children: React.ReactNode }) {
  return (
    <MobileRefreshProvider>
      <AppPageShellInner>{children}</AppPageShellInner>
    </MobileRefreshProvider>
  );
}
