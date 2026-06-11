import { SiteFooter } from '@/components/layout/site-footer';

type PublicPageShellProps = {
  children: React.ReactNode;
  footerVariant?: 'full' | 'minimal';
};

export function PublicPageShell({ children, footerVariant = 'full' }: PublicPageShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <div className="relative flex-1">{children}</div>
      <SiteFooter variant={footerVariant} />
    </div>
  );
}
