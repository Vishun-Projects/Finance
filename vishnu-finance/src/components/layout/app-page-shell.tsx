'use client';

import { usePathname } from 'next/navigation';
import { patterns } from '@/design/patterns';
import { cn } from '@/lib/utils';
import { MobileScreenShell } from '@/components/layout/mobile-screen-shell';
import { MobileScrollEndSpacer } from '@/components/layout/mobile-scroll-end-spacer';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { MobileRefreshProvider, useMobileRefresh } from '@/contexts/MobileRefreshContext';
import { ScrollOwnerProvider } from '@/contexts/scroll-owner-context';
import { getRouteLayoutConfig } from '@/lib/layout-config';

function AppPageShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile('lg');
  const { fullBleed, noTopOffset, tableScrollShell, scrollMode } = getRouteLayoutConfig(pathname);
  const { onRefresh, hasRefreshHandler } = useMobileRefresh() ?? {};

  const content = (
    <>
      {children}
      {scrollMode === 'page' ? <MobileScrollEndSpacer /> : null}
    </>
  );

  if (isMobile) {
    return (
      <MobileScreenShell
        fullBleed={fullBleed}
        noTopOffset={noTopOffset}
        tableScrollShell={tableScrollShell}
        onRefresh={onRefresh}
        refreshEnabled={hasRefreshHandler}
      >
        {content}
      </MobileScreenShell>
    );
  }

  return (
    <div className={cn('flex min-h-full flex-col', patterns.desktopContentShell, patterns.pageShellMobile, tableScrollShell ? 'flex-1 min-h-0 overflow-hidden pt-0 lg:pt-8' : 'pt-4 lg:pt-8')}>
      {content}
    </div>
  );
}

export function AppPageShell({ children }: { children: React.ReactNode }) {
  return (
    <ScrollOwnerProvider>
      <MobileRefreshProvider>
        <AppPageShellInner>{children}</AppPageShellInner>
      </MobileRefreshProvider>
    </ScrollOwnerProvider>
  );
}
