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
import type { User } from "@/contexts/AuthContext";
const toIsoString = (value: unknown): string | undefined => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return undefined;
};

function normalizeAuthUser(input: unknown): User | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const value = input as Record<string, unknown>;
  const id = typeof value.id === 'string' ? value.id : null;
  const email = typeof value.email === 'string' ? value.email : null;

  if (!id || !email) {
    return null;
  }

  return {
    id,
    email,
    name: typeof value.name === 'string' ? value.name : undefined,
    avatarUrl: typeof value.avatarUrl === 'string' ? value.avatarUrl : undefined,
    gender: typeof value.gender === 'string' ? (value.gender as User['gender']) : undefined,
    phone: typeof value.phone === 'string' ? value.phone : undefined,
    dateOfBirth: toIsoString(value.dateOfBirth),
    addressLine1: typeof value.addressLine1 === 'string' ? value.addressLine1 : undefined,
    addressLine2: typeof value.addressLine2 === 'string' ? value.addressLine2 : undefined,
    city: typeof value.city === 'string' ? value.city : undefined,
    state: typeof value.state === 'string' ? value.state : undefined,
    country: typeof value.country === 'string' ? value.country : undefined,
    pincode: typeof value.pincode === 'string' ? value.pincode : undefined,
    occupation: typeof value.occupation === 'string' ? value.occupation : undefined,
    bio: typeof value.bio === 'string' ? value.bio : undefined,
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
    lastLogin: toIsoString(value.lastLogin),
    createdAt: toIsoString(value.createdAt) ?? new Date().toISOString(),
    updatedAt: toIsoString(value.updatedAt),
    role: typeof value.role === 'string' ? (value.role as User['role']) : undefined,
  };
}

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
  viewportFit: 'cover',
};

import FetchInterceptor from "@/components/fetch-interceptor";
import { DesignProvider } from "@/components/providers/design-provider";
import { getDesignSettings } from "@/app/actions/design-system";

import { Inter, JetBrains_Mono /*, Newsreader*/ } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

/*
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"]
});
*/

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  const normalizedUser = normalizeAuthUser(currentUser);

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <FetchInterceptor />
        <AuthProvider initialUser={normalizedUser}>
          <ThemeProvider>
            <DesignProvider initialSettings={await getDesignSettings()}>
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
            </DesignProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
