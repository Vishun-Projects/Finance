'use client';

import Link from 'next/link';
import Image from 'next/image';
import { legalConfig } from '@/lib/legal-config';
import { Button } from '@/components/ui/button';
import { PolicyNavList } from '@/components/legal/policy-nav-list';

export function PolicySidebar() {
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col lg:flex lg:sticky lg:top-8 lg:self-start lg:border-r lg:border-border/40 lg:pr-8">
      <Link href="/about" className="mb-6 flex items-center gap-2.5 transition-opacity hover:opacity-90">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card">
          <Image
            src="/icon-removebg-preview.png"
            alt=""
            width={22}
            height={22}
            className="object-contain"
          />
        </div>
        <span className="text-sm font-semibold tracking-tight">{legalConfig.brandName}</span>
      </Link>

      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Legal &amp; info
      </p>
      <PolicyNavList />

      <div className="mt-8">
        <Button asChild className="w-full rounded-lg" size="sm">
          <Link href="/auth?tab=login">Sign in</Link>
        </Button>
      </div>
    </aside>
  );
}
