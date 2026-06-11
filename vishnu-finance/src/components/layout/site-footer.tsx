import Link from 'next/link';
import {
  formatRegisteredAddress,
  isRegisteredAddressConfigured,
  legalConfig,
  policyLinks,
} from '@/lib/legal-config';
import { cn } from '@/lib/utils';

type SiteFooterProps = {
  /** @deprecated Use variant instead */
  compact?: boolean;
  variant?: 'full' | 'minimal' | 'compact' | 'auth';
  /** Hide legal policy links on mobile — legal lives in Settings */
  hideLegalLinksOnMobile?: boolean;
};

export function SiteFooter({ compact = false, variant, hideLegalLinksOnMobile = false }: SiteFooterProps) {
  const resolvedVariant = variant ?? (compact ? 'compact' : 'full');
  const year = new Date().getFullYear();
  const addressConfigured = isRegisteredAddressConfigured();
  const addressOneLiner = formatRegisteredAddress().replace(/\n/g, ', ');

  if (resolvedVariant === 'auth' || resolvedVariant === 'minimal') {
    return (
      <footer
        className={cn(
          resolvedVariant === 'auth'
            ? 'mt-2'
            : 'border-t border-border/60 bg-background/90'
        )}
      >
        <div
          className={cn(
            'mx-auto flex max-w-lg flex-col items-center gap-3 text-center',
            resolvedVariant === 'auth' ? 'px-0 py-2' : 'px-4 py-5'
          )}
        >
          <nav
            className={cn(
              'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground',
              hideLegalLinksOnMobile && 'hidden lg:flex'
            )}
            aria-label="Legal policies"
          >
            {policyLinks.map((link, i) => (
              <span key={link.href} className="inline-flex items-center gap-3">
                {i > 0 && <span className="text-border" aria-hidden>|</span>}
                <Link href={link.href} className="hover:text-foreground hover:underline">
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>
          <p className="text-[11px] text-muted-foreground/80">
            © {year} {legalConfig.brandName}
          </p>
        </div>
      </footer>
    );
  }

  const legalNavItems = [
    ...policyLinks,
    { href: '/about', label: 'About' },
  ] as const;

  return (
    <footer className="mt-auto border-t border-border/60 bg-card/30 safe-bottom">
      <div
        className={cn(
          'mx-auto max-w-6xl px-4 sm:px-6',
          resolvedVariant === 'compact' ? 'py-5' : 'py-8 sm:py-10'
        )}
      >
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">{legalConfig.legalName}</p>
            {resolvedVariant === 'full' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Trading as <span className="text-foreground">{legalConfig.brandName}</span>
                </p>
                {addressConfigured ? (
                  <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                    {addressOneLiner}
                  </p>
                ) : null}
              </>
            )}
            <p className="text-sm text-muted-foreground">
              <a
                href={`mailto:${legalConfig.supportEmail}`}
                className="text-foreground/90 hover:text-primary hover:underline"
              >
                {legalConfig.supportEmail}
              </a>
              <span className="mx-2 text-border" aria-hidden>
                ·
              </span>
              <a
                href={`tel:${legalConfig.supportPhone.replace(/\s/g, '')}`}
                className="text-foreground/90 hover:text-primary hover:underline"
              >
                {legalConfig.supportPhone}
              </a>
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Legal
            </p>
            <nav
              className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-1"
              aria-label="Legal policies"
            >
              {legalNavItems.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <p className="mt-8 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground sm:text-left">
          © {year} {legalConfig.legalName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
