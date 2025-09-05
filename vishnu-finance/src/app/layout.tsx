import type { Metadata } from "next";
import "./globals.css";
import TutorialGuide from "@/components/TutorialGuide";
import { AuthProvider } from "@/contexts/AuthContext";
import { LayoutProvider } from "@/contexts/LayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

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
        <AuthProvider>
          <ThemeProvider>
            <LayoutProvider>
              {children}
              <TutorialGuide />
            </LayoutProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
