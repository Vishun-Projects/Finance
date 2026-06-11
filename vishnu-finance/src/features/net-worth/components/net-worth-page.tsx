'use client';

import { NetWorthSection } from '@/features/settings/components/net-worth-section';
import { PageMandate } from '@/components/layout/page-mandate';
import { patterns } from '@/design/patterns';
import { cn } from '@/lib/utils';

export default function NetWorthPage() {
  return (
    <div className={cn(patterns.pageColumn, 'space-y-6')}>
      <PageMandate
        title="Assets & debt"
        mandate="What you own minus what you owe — not the same as bank balance on Transactions."
      />
      <NetWorthSection />
    </div>
  );
}
