'use client';

import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { LegalProse } from '@/components/legal/legal-prose';
import { legalConfig } from '@/lib/legal-config';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

type InAppLegalShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  backHref?: string;
  onBack?: () => void;
};

export function InAppLegalShell({
  title,
  description,
  children,
  className,
  backHref = '/settings',
  onBack,
}: InAppLegalShellProps) {
  const effectiveDescription =
    description ?? `Operated by ${legalConfig.legalName} · Effective ${legalConfig.effectiveDate}`;

  const backControl = onBack ? (
    <button
      type="button"
      className="btn-touch flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground lg:size-10"
      onClick={() => {
        void hapticLight();
        onBack();
      }}
      aria-label="Back to Settings"
    >
      <ArrowLeft className="size-4" />
    </button>
  ) : (
    <Link
      href={backHref}
      className="btn-touch flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground lg:size-10"
      onClick={() => void hapticLight()}
      aria-label="Back to Settings"
    >
      <ArrowLeft className="size-4" />
    </Link>
  );

  return (
    <div
      className={cn(
        'flex min-h-full flex-col pt-2 lg:pb-16 lg:pt-0',
        className
      )}
    >
      <div className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-30 mb-4 border-b border-border bg-background/95 py-3 backdrop-blur lg:static lg:mb-6 lg:border-0 lg:bg-transparent lg:py-0 lg:backdrop-blur-none">
        <div className="flex items-center gap-3 lg:gap-4">
          {backControl}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-foreground lg:text-2xl">
              {title}
            </h1>
            <p className="truncate text-xs text-muted-foreground lg:mt-1 lg:text-sm">
              {effectiveDescription}
            </p>
          </div>
          <FileText className="size-4 shrink-0 text-primary lg:size-5" aria-hidden />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card p-4 lg:p-8">
        <LegalProse>{children}</LegalProse>
      </div>
    </div>
  );
}
