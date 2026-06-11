import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/legal-page-shell';
import { ShippingContent } from '@/features/legal/content/policy-sections';
import { legalConfig } from '@/lib/legal-config';

export const metadata: Metadata = {
  title: `Shipping & Service Delivery | ${legalConfig.brandName}`,
  description: `Digital service delivery policy for ${legalConfig.brandName}.`,
};

export default function ShippingPage() {
  return (
    <LegalPageShell title="Shipping & Service Delivery Policy">
      <ShippingContent />
    </LegalPageShell>
  );
}
