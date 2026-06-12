'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { useNavigationPending } from '@/contexts/navigation-pending-context';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  href: string;
  className?: string;
  linkClassName?: string;
  children: ReactNode;
  onClick?: () => void;
  prefetch?: boolean;
  'aria-label'?: string;
  'data-bottom-nav-active'?: string;
}

function LinkPendingContent({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const navigationPending = useNavigationPending();
  const pending =
    navigationPending?.pendingHref === href &&
    pathname !== href &&
    !pathname.startsWith(`${href}/`);

  return (
    <span
      aria-busy={pending || undefined}
      className={cn('flex min-w-0 items-center', className, pending && 'opacity-70 transition-opacity')}
    >
      {children}
    </span>
  );
}

export function NavLink({
  href,
  className,
  linkClassName,
  children,
  onClick,
  prefetch = true,
  'aria-label': ariaLabel,
  'data-bottom-nav-active': dataActive,
}: NavLinkProps) {
  const navigationPending = useNavigationPending();

  const handleClick = () => {
    navigationPending?.registerPending(href, true);
    onClick?.();
  };

  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-label={ariaLabel}
      data-bottom-nav-active={dataActive}
      onClick={handleClick}
      className={cn('outline-none', linkClassName)}
    >
      <LinkPendingContent href={href} className={className}>
        {children}
      </LinkPendingContent>
    </Link>
  );
}
