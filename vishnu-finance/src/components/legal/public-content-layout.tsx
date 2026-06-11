import { PolicySidebar } from '@/components/legal/policy-sidebar';
import { PublicMobileChrome } from '@/components/legal/public-mobile-chrome';
import { PublicPageShell } from '@/components/layout/public-page-shell';

type PublicContentLayoutProps = {
  children: React.ReactNode;
};

/** Public pages: mobile drawer + desktop sidebar + footer (no top navbar on desktop). */
export function PublicContentLayout({ children }: PublicContentLayoutProps) {
  return (
    <PublicPageShell footerVariant="full">
      <PublicMobileChrome />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          <PolicySidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </PublicPageShell>
  );
}
