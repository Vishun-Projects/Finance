'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { policyLinks, legalConfig } from '@/lib/legal-config';
import { cn } from '@/lib/utils';

const aboutLink = { href: '/about', label: 'About' } as const;

export const publicNavItems = [...policyLinks, aboutLink] as const;

export function getPublicPageTitle(pathname: string): string {
  const match = publicNavItems.find((item) => item.href === pathname);
  return match?.label ?? legalConfig.brandName;
}

type PolicyNavListProps = {
  onNavigate?: () => void;
  className?: string;
};

export function PolicyNavList({ onNavigate, className }: PolicyNavListProps) {
  const pathname = usePathname();

  return (
    <nav className={cn('flex flex-col gap-0.5', className)} aria-label="Policy pages">
      {publicNavItems.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              'flex min-h-11 items-center rounded-lg px-3 text-sm transition-colors',
              isActive
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
