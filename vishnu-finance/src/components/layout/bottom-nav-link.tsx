'use client';

import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { useNavigationPending } from '@/contexts/navigation-pending-context';

interface BottomNavLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  'data-bottom-nav-active'?: string;
}

function LinkPendingRegistrar({ href }: { href: string }) {
  const { pending } = useLinkStatus();
  const navigationPending = useNavigationPending();

  useEffect(() => {
    navigationPending?.registerPending(href, pending);
    return () => navigationPending?.registerPending(href, false);
  }, [href, navigationPending, pending]);

  return null;
}

export function BottomNavLink({
  href,
  className,
  children,
  onClick,
  'data-bottom-nav-active': dataActive,
}: BottomNavLinkProps) {
  return (
    <Link
      href={href}
      prefetch
      data-bottom-nav-active={dataActive}
      onClick={onClick}
      className={className}
    >
      <LinkPendingRegistrar href={href} />
      {children}
    </Link>
  );
}
