import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/legal-page-shell';
import { RefundsContent } from '@/features/legal/content/policy-sections';
import { legalConfig } from '@/lib/legal-config';

export const metadata: Metadata = {
  title: `Cancellation & Refunds | ${legalConfig.brandName}`,
  description: `Cancellation and refund policy for ${legalConfig.brandName}.`,
};

export default function RefundsPage() {
  return (
    <LegalPageShell title="Cancellation & Refunds Policy">
      <RefundsContent />
    </LegalPageShell>
  );
}
