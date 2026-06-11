import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/legal-page-shell';
import { ContactContent } from '@/features/legal/content/policy-sections';
import { legalConfig } from '@/lib/legal-config';

export const metadata: Metadata = {
  title: `Contact Us | ${legalConfig.brandName}`,
  description: `Contact ${legalConfig.legalName} — support and grievance officer details.`,
};

export default function ContactPage() {
  return (
    <LegalPageShell title="Contact Us">
      <ContactContent />
    </LegalPageShell>
  );
}
