'use client';

import { NetWorthSection } from '@/features/settings/components/net-worth-section';
import { PageMandate } from '@/components/layout/page-mandate';
import { patterns } from '@/design/patterns';
import { cn } from '@/lib/utils';
import type { NetWorthBreakdown } from '@/lib/net-worth-service';

interface NetWorthPageProps {
  initialData?: NetWorthBreakdown;
}

export default function NetWorthPage({ initialData }: NetWorthPageProps) {
  return (
    <div className={cn(patterns.pageColumn, 'space-y-6')}>
      <PageMandate
        title="Assets & debt"
        mandate="What you own minus what you owe — not the same as bank balance on Transactions."
        hideTitleOnMobile
      />
      <NetWorthSection initialData={initialData} />
    </div>
  );
}
