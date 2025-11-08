import type { Metadata } from "next";
import Navigation from "@/components/layout/navigation";
import { ProtectedRoute } from "@/components/assistants/protected-route";

export const metadata: Metadata = {
  title: "Vishnu Finance - Dashboard",
  description: "Personal Finance Management Dashboard",
};

export default function AppLayout({ children }: { children: React.ReactNode; }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <Navigation />
        <main className="pt-20 pb-6 w-full">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
