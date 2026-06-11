'use client';

import {
  BarChart3,
  Brain,
  Shield,
  Target,
  Wallet,
} from 'lucide-react';
import { legalConfig } from '@/lib/legal-config';
import {
  ContactContent,
  PrivacyContent,
  RefundsContent,
  ShippingContent,
  TermsContent,
} from '@/features/legal/content/policy-sections';
import { LegalProse } from '@/components/legal/legal-prose';
import { SettingsPageLayout } from '@/features/settings/components/settings-ui';
import type { LegalDocHref } from '@/features/settings/components/settings-nav-config';

const features = [
  {
    icon: BarChart3,
    title: 'Smart dashboard',
    description: 'Track income, expenses, and net worth in one place.',
  },
  {
    icon: Wallet,
    title: 'Bank imports',
    description: 'Import PDF and CSV statements with automatic categorization.',
  },
  {
    icon: Target,
    title: 'Goals & plans',
    description: 'Deadlines, wishlist, salary structure, and phase money planning.',
  },
  {
    icon: Brain,
    title: 'AI advisor',
    description: 'Insights and education tailored to your financial data.',
  },
  {
    icon: Shield,
    title: 'Secure by design',
    description: 'Encrypted sessions, document vault, and privacy controls.',
  },
];

function AboutSettingsContent() {
  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-primary">Operated by {legalConfig.legalName}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Personal finance management, built for India
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {legalConfig.brandName} helps you organize income, expenses, goals, and financial
          decisions in one secure platform — with INR-focused workflows and tools that match how
          you actually manage money.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold tracking-tight">What you get</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-xl border border-border bg-surface/50 p-4">
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-4 text-primary" aria-hidden />
              </div>
              <h4 className="text-sm font-medium text-foreground">{title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface/50 p-4">
        <h3 className="text-sm font-semibold">Pricing</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Paid subscription plans are coming soon. You currently have free access to core features.
          For business inquiries, contact{' '}
          <a href={`mailto:${legalConfig.supportEmail}`} className="text-primary hover:underline">
            {legalConfig.supportEmail}
          </a>
          .
        </p>
      </section>
    </div>
  );
}

const LEGAL_CONTENT: Record<LegalDocHref, React.ReactNode> = {
  '/terms': <TermsContent />,
  '/privacy': <PrivacyContent />,
  '/shipping': <ShippingContent />,
  '/refunds': <RefundsContent />,
  '/contact': <ContactContent />,
  '/about': <AboutSettingsContent />,
};

type SettingsLegalPanelProps = {
  docId: LegalDocHref;
};

export function SettingsLegalPanel({ docId }: SettingsLegalPanelProps) {
  const content = LEGAL_CONTENT[docId];
  const isPolicyDoc = docId !== '/about';

  return (
    <SettingsPageLayout>
      <div className="overflow-hidden rounded-xl border border-border bg-card p-4 lg:p-8">
        {isPolicyDoc ? <LegalProse>{content}</LegalProse> : content}
      </div>
    </SettingsPageLayout>
  );
}
