'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutGrid,
  Heart,
  ReceiptText,
  Layers,
  Brain,
  Settings,
  Wallet,
  LogOut,
  User as UserIcon,
  BookOpen,
  Menu,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { navLinkVariants } from '@/design/variants';
import { patterns } from '@/design/patterns';

const primaryNavItemsConfig = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/education', label: 'Insights', icon: BookOpen },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/plans', label: 'Plans', icon: Layers },
  { href: '/financial-health', label: 'Health Score', icon: Heart },
  { href: '/salary', label: 'Salary', icon: Wallet },
  { href: '/advisor', label: 'AI Advisor', icon: Brain },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const mobilePrimaryNavItems = [
  ...primaryNavItemsConfig.slice(0, 4),
  { href: '#menu', label: 'More', icon: Menu },
];
const mobileDrawerItems = primaryNavItemsConfig.slice(4);

export default function Navigation() {
  const { user, logout } = useAuth();
  const { setTheme, isLoading, isDark } = useTheme();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const isDarkMode = !isLoading && isDark;

  const activeByHref = useMemo(() => {
    return new Set(
      primaryNavItemsConfig
        .filter(item => pathname === item.href || pathname.startsWith(item.href + '/'))
        .map(item => item.href)
    );
  }, [pathname]);

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
            className={cn(navLinkVariants({ active: false }), 'w-full')}
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
              <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive focus:bg-[var(--danger-bg)] focus:text-destructive">
                <LogOut className="mr-2 size-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card lg:hidden">
        <div className="mx-auto flex h-16 w-full max-w-screen-sm items-center justify-around gap-1 px-2 pb-[env(safe-area-inset-bottom)] sm:px-4">
          {mobilePrimaryNavItems.map((item) => {
            const Icon = item.icon;
            const isMenu = item.label === 'More';
            const isActive = activeByHref.has(item.href) && !isMenu;

            if (isMenu) {
              return (
                <Sheet key={item.label} open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <button className="flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-lg text-muted transition-all duration-200 active:scale-95 hover:text-foreground">
                      <Icon className="size-5" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh] rounded-t-lg border-t border-border bg-card p-0">
                    <SheetHeader className="border-b border-border p-6 text-left">
                      <SheetTitle className="flex items-center gap-3 text-lg font-medium">
                        <Avatar userId={user?.id || 'guest'} src={user?.avatarUrl} size="md" />
                        <div className="flex flex-col">
                          <span className="max-w-[180px] truncate text-base">{user?.name || 'Guest User'}</span>
                          <span className="text-xs font-normal text-hint">{user?.email}</span>
                        </div>
                      </SheetTitle>
                    </SheetHeader>

                    <div className="custom-scrollbar flex h-full flex-col overflow-y-auto px-4 py-6 pb-20">
                      <div className="space-y-1">
                        <p className="mb-3 px-2 text-xs font-medium uppercase tracking-wider text-hint">More</p>
                        {mobileDrawerItems.map((drawerItem) => {
                          const DrawerIcon = drawerItem.icon;
                          const isDrawerActive = activeByHref.has(drawerItem.href);
                          return (
                            <Link
                              key={drawerItem.href}
                              href={drawerItem.href}
                              onClick={() => setIsSheetOpen(false)}
                              className={navLinkVariants({ active: isDrawerActive })}
                            >
                              <DrawerIcon className="size-5" />
                              <span>{drawerItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>

                      <div className="mt-8 space-y-1">
                        <p className="mb-3 px-2 text-xs font-medium uppercase tracking-wider text-hint">Preferences</p>
                        <div className="flex items-center justify-between rounded-md px-3 py-3 text-muted hover:bg-surface" suppressHydrationWarning>
                          <div className="flex items-center gap-3">
                            {isDarkMode ? <Moon className="size-5" /> : <Sun className="size-5" />}
                            <span className="text-sm font-medium">Dark Mode</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
                            className="h-6 w-10 p-0"
                          >
                            <div className={cn('relative h-4 w-8 rounded-full transition-colors', isDarkMode ? 'bg-accent' : 'bg-surface')}>
                              <div className={cn('absolute top-0.5 size-3 rounded-full bg-background transition-all', isDarkMode ? 'left-4' : 'left-0.5')} />
                            </div>
                          </Button>
                        </div>

                        <button
                          onClick={() => logout()}
                          className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-destructive transition-colors hover:bg-[var(--danger-bg)]"
                        >
                          <LogOut className="size-5" />
                          <span className="text-sm font-medium">Log out</span>
                        </button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-lg transition-all duration-200 active:scale-95',
                  isActive ? 'text-foreground' : 'text-muted hover:text-foreground'
                )}
              >
                <Icon className={cn('size-5', isActive && 'scale-110')} />
                <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className={cn(
        "fixed top-0 left-0 right-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background px-4 transition-all duration-300 lg:hidden",
        pathname === '/dashboard' ? "pointer-events-none invisible h-0 opacity-0" : "visible h-12 opacity-100"
      )}>
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center">
            <img src="/icon-removebg-preview.png" alt="Logo" className="size-full object-contain" />
          </div>
          <span className="text-xs font-medium tracking-wide text-foreground">Vishnu Finance</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className="flex size-8 items-center justify-center rounded-md border border-border text-muted hover:bg-surface hover:text-foreground"
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
