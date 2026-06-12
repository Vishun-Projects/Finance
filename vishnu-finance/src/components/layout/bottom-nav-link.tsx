'use client';

import { type ReactNode } from 'react';
import { NavLink } from '@/components/layout/nav-link';

interface BottomNavLinkProps {
  href: string;
  className?: string;
  linkClassName?: string;
  children: ReactNode;
  onClick?: () => void;
  'data-bottom-nav-active'?: string;
}

export function BottomNavLink(props: BottomNavLinkProps) {
  return <NavLink {...props} />;
}
