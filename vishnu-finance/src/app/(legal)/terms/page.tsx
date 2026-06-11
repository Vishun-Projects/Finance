import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/legal-page-shell';
import { TermsContent } from '@/features/legal/content/policy-sections';
import { legalConfig } from '@/lib/legal-config';

export const metadata: Metadata = {
  title: `Terms & Conditions | ${legalConfig.brandName}`,
  description: `Terms and Conditions for ${legalConfig.brandName} operated by ${legalConfig.legalName}.`,
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms & Conditions">
      <TermsContent />
    </LegalPageShell>
  );
}
