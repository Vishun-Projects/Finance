import type { Metadata } from 'next';
import { LegalAppChrome } from '@/components/legal/legal-app-chrome';

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <LegalAppChrome>{children}</LegalAppChrome>;
}
