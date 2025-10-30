import type { Metadata } from "next";
import "./globals.css";
import TutorialGuide from "@/components/TutorialGuide";
import GlobalPreloader from "@/components/GlobalPreloader";
import { AuthProvider } from "@/contexts/AuthContext";
import { LayoutProvider } from "@/contexts/LayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { QueryProvider } from "@/contexts/QueryProvider";
import { LoadingProvider } from "@/contexts/LoadingContext";

export const metadata: Metadata = {
  title: "Vishnu Finance - Personal Finance Manager",
  description: "A comprehensive personal finance management application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              <CurrencyProvider>
                <ToastProvider>
                  <LoadingProvider>
                    <LayoutProvider>
                      {children}
                      <TutorialGuide />
                      <GlobalPreloader />
                    </LayoutProvider>
                  </LoadingProvider>
                </ToastProvider>
              </CurrencyProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
