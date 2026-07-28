import type { Metadata } from "next";
import { Suspense } from "react";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { MainScrollContainer } from "@/components/layout/main-scroll-container";
import { NavigationLoadingListener } from "@/components/layout/navigation-loading-listener";
import NavigationIsland from "@/components/layout/navigation-island";
import { NavigationPendingProvider } from "@/contexts/navigation-pending-context";

export const metadata: Metadata = {
  title: "Vishnu Finance - Dashboard",
  description: "Personal Finance Management Dashboard",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationPendingProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <NavigationLoadingListener />
        <Suspense
          fallback={
            <div className="hidden lg:flex w-64 border-r border-border bg-sidebar flex-col shrink-0 h-full p-4">
              <div className="h-8 w-32 bg-foreground/5 rounded animate-pulse mb-8" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 w-full bg-foreground/5 rounded animate-pulse" />
                ))}
              </div>
            </div>
          }
        >
          <NavigationIsland />
        </Suspense>

        <MainScrollContainer>
          <AppPageShell>{children}</AppPageShell>
        </MainScrollContainer>
      </div>
    </NavigationPendingProvider>
  );
}
