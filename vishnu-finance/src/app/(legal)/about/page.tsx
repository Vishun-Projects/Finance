import type { Metadata } from 'next';
import { AboutPageContent } from '@/features/legal/components/about-page';
import { legalConfig } from '@/lib/legal-config';

export const metadata: Metadata = {
  title: `About | ${legalConfig.brandName}`,
  description: `${legalConfig.brandName} — personal finance management app operated by ${legalConfig.legalName}.`,
};

export default function AboutPage() {
  return <AboutPageContent />;
}
