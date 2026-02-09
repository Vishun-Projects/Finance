import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/server-auth";
import { RouteLoadingState } from "@/components/feedback/route-fallbacks";
import NavigationIsland from "@/components/layout/navigation-island";

export const metadata: Metadata = {
  title: "Vishnu Finance - Dashboard",
  description: "Personal Finance Management Dashboard",
};

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser({ redirectTo: "/auth?tab=login" });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
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

      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-y-auto custom-scrollbar overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
