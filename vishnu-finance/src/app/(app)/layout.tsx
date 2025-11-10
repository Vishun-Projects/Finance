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
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      <Suspense
        fallback={
          <RouteLoadingState
            title="Loading workspace"
            description="Preparing your dashboard navigation…"
            className="min-h-[4rem]"
          />
        }
      >
        <NavigationIsland />
      </Suspense>
      <main className="mx-auto w-full max-w-screen-2xl px-3 pt-20 pb-20 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 lg:pb-10">
        {children}
      </main>
    </div>
  );
}
