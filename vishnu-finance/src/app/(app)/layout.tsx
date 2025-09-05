import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const metadata: Metadata = {
  title: "Vishnu Finance - Dashboard",
  description: "Personal Finance Management Dashboard",
};

export default function AppLayout({ children }: { children: React.ReactNode; }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="pt-20 px-6 pb-6">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
