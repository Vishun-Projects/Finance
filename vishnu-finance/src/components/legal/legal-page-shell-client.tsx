'use client';

import { FileText } from 'lucide-react';
import { PublicContentLayout } from '@/components/legal/public-content-layout';
import { InAppLegalShell } from '@/components/legal/in-app-legal-shell';
import { LegalProse } from '@/components/legal/legal-prose';
import { useAuth } from '@/contexts/AuthContext';
import { legalConfig } from '@/lib/legal-config';

type LegalPageShellClientProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function LegalPageShellClient({ title, description, children }: LegalPageShellClientProps) {
  const { user } = useAuth();

  if (user) {
    return (
      <InAppLegalShell title={title} description={description}>
        {children}
      </InAppLegalShell>
    );
  }

  return (
    <PublicContentLayout>
      <div className="mx-auto max-w-prose overflow-hidden rounded-2xl border border-border/80 bg-card/50 shadow-sm backdrop-blur-sm lg:max-w-none">
        <div className="border-b border-border/60 bg-muted/20 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background shadow-sm">
              <FileText className="size-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {description ?? (
                  <>
                    Operated by {legalConfig.legalName} · Effective {legalConfig.effectiveDate}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <LegalProse>{children}</LegalProse>
        </div>
      </div>
    </PublicContentLayout>
  );
}
