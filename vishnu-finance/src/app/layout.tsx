import type { Metadata, Viewport } from "next";
import "./globals.css";
import GlobalPreloader from "@/components/feedback/global-preloader";
import { AuthProvider } from "@/contexts/AuthContext";
import { LayoutProvider } from "@/contexts/LayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUser } from "@/lib/auth/server-auth";

export const metadata: Metadata = {
  title: "Vishnu Finance - Personal Finance Manager",
  description: "A comprehensive personal finance management application",
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <AuthProvider initialUser={currentUser}>
          <ThemeProvider>
            <CurrencyProvider>
              <ToastProvider>
                <LoadingProvider>
                  <LayoutProvider>
                    {children}
                    <GlobalPreloader />
                    <Toaster />
                  </LayoutProvider>
                </LoadingProvider>
              </ToastProvider>
            </CurrencyProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
