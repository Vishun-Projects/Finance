import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/legal-page-shell';
import { PrivacyContent } from '@/features/legal/content/policy-sections';
import { legalConfig } from '@/lib/legal-config';

export const metadata: Metadata = {
  title: `Privacy Policy | ${legalConfig.brandName}`,
  description: `Privacy Policy for ${legalConfig.brandName} — how we collect and use your data.`,
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <PrivacyContent />
    </LegalPageShell>
  );
}
