'use client';

import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-breakpoint';
import NavigationIsland from '@/components/layout/navigation-island';

export function LegalAppChrome({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile('lg');

  if (loading || !user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground lg:h-screen">
      <Suspense fallback={null}>
        <NavigationIsland />
      </Suspense>
      <main
        className={`custom-scrollbar min-w-0 flex-1 overflow-y-auto overflow-x-hidden ${isMobile ? 'max-lg:pb-[var(--app-bottom-inset)]' : 'pb-0'}`}
      >
        {children}
      </main>
    </div>
  );
}
