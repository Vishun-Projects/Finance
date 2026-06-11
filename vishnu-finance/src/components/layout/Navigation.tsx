'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import {
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { patterns } from '@/design/patterns';
import { navLinkVariants } from '@/design/variants';
import {
  getPageTitle,
  mobileBottomNavItems,
  primaryNavItemsConfig,
} from '@/lib/nav-config';
import { hapticLight } from '@/lib/haptics';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

export default function Navigation() {
  const { user, logout } = useAuth();
  const { setTheme, isLoading, isDark } = useTheme();
  const { actions: pageActions } = usePageHeader();
  const pathname = usePathname();
  const isDarkMode = !isLoading && isDark;
  const pageTitle = getPageTitle(pathname);
  const hideMobileTopBar = pathname === '/dashboard' || pathname === '/advisor' || pathname === '/plans';

  const activeByHref = useMemo(() => {
    return new Set(
      primaryNavItemsConfig
        .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
        .map((item) => item.href)
    );
  }, [pathname]);

  const handleNavTap = () => {
    void hapticLight();
  };

  return (
    <>
      <aside className={cn(patterns.sidebar, 'hidden lg:flex h-full z-50')}>
        <div className="mb-10 flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center">
            <img src="/icon-removebg-preview.png" alt="Logo" className="size-full object-contain" />
          </div>
          <span className="text-base font-medium tracking-tight text-foreground">Vishnu Finance</span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {primaryNavItemsConfig.map((item) => {
            const Icon = item.icon;
            const isActive = activeByHref.has(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkVariants({ active: isActive })}
                onClick={handleNavTap}
              >
                <Icon className={cn('size-4', isActive ? 'text-foreground' : 'text-hint')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-border pt-5">
          <button
            type="button"
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className={cn(navLinkVariants({ active: false }), 'w-full btn-touch')}
            suppressHydrationWarning
          >
            {isDarkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
            <span>{isDarkMode ? 'Dark mode' : 'Light mode'}</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-md border border-border bg-surface p-3 text-left outline-none">
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden border border-border bg-background">
                  {user?.avatarUrl ? (
                    <img alt="Profile" className="size-full object-cover" src={user.avatarUrl} />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-surface text-muted">
                      <UserIcon className="size-4" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{user?.name || 'User'}</span>
                  <span className="text-xs text-hint">{user?.email}</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mb-2 w-56 border-border bg-card text-foreground">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => logout()}
                className="cursor-pointer text-destructive focus:bg-[var(--danger-bg)] focus:text-destructive"
              >
                <LogOut className="mr-2 size-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <MobileBottomNav items={mobileBottomNavItems} activeByHref={activeByHref} />

      <div
        className={cn(
          'safe-top fixed top-0 left-0 right-0 z-40 flex h-12 items-center justify-between px-4 glass-ultra-thin glass-text lg:hidden',
          hideMobileTopBar ? 'pointer-events-none invisible h-0 opacity-0' : 'visible h-12 opacity-100'
        )}
      >
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-foreground">{pageTitle}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {pageActions}
          <button
            type="button"
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className="btn-touch flex size-9 items-center justify-center rounded-md border border-border text-muted hover:bg-surface hover:text-foreground"
            aria-label="Toggle theme"
            suppressHydrationWarning
          >
            {isDarkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>
        </div>
      </div>
    </>
  );
}
