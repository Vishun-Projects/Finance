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

// Map user's requested icons to Lucide equivalent
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
  ...primaryNavItemsConfig.slice(0, 4), // Top 4 priority items
  { href: '#menu', label: 'More', icon: Menu }, // 5th item triggers menu
];
// Drawer contains everything NOT in the top 4
const mobileDrawerItems = primaryNavItemsConfig.slice(4);

export default function Navigation() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const activeByHref = useMemo(() => {
    return new Set(
      primaryNavItemsConfig
        .filter(item => pathname === item.href || pathname.startsWith(item.href + '/'))
        .map(item => item.href)
    );
  }, [pathname]);

  return (
    <>
      {/* Desktop Sidebar - Matches User Design */}
      <aside className="hidden lg:flex w-64 border-r border-border flex-col py-8 px-6 bg-sidebar shrink-0 h-full z-50">
        {/* Brand */}
        <div className="flex items-center justify-between gap-3 mb-12">
          <div className="flex items-center gap-3">
            <div className="size-8 flex items-center justify-center shrink-0">
              <img src="/icon-removebg-preview.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">Vishnu Finance</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-1">
          {primaryNavItemsConfig.map((item) => {
            const Icon = item.icon;
            const isActive = activeByHref.has(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 w-full px-3 py-3 transition-all duration-200 border-l-4 ${isActive
                  ? 'text-foreground bg-muted/50 border-l-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border-l-transparent'
                  }`}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground/40")} />
                <span className={cn("text-[11px] font-black uppercase tracking-widest", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Profile Footer */}
        <div className="mt-auto pt-6 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full text-left outline-none group bg-muted/20 p-3 border border-border/50">
                <div className="size-9 border border-border flex items-center justify-center overflow-hidden shrink-0 transition-all bg-background">
                  {user?.avatarUrl ? (
                    <img alt="Profile" className="size-full object-cover" src={user.avatarUrl} />
                  ) : (
                    <div className="size-full flex items-center justify-center text-muted-foreground bg-muted">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-black uppercase tracking-tight truncate text-foreground leading-none mb-1">{user?.name || 'User'}</span>
                  <div className="flex">
                    <span className="text-[8px] px-1.5 py-0.5 bg-primary/10 text-primary font-black uppercase tracking-widest border border-primary/20">Audit Tier: 1</span>
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-2 bg-card border-border text-foreground">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
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
                    <button
                      className="flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-all duration-200 active:scale-95 text-muted-foreground hover:text-foreground"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh] bg-card border-t border-border p-0 rounded-none">
                    {/* Reusing the Drawer Content Logic but adapting for bottom sheet style */}
                    <SheetHeader className="p-6 text-left border-b border-border">
                      <SheetTitle className="text-lg font-bold flex items-center gap-3">
                        <Avatar
                          userId={user?.id || 'guest'}
                          src={user?.avatarUrl}
                          size="md"
                        />
                        <div className="flex flex-col">
                          <span className="text-base truncate max-w-[180px]">{user?.name || 'Guest User'}</span>
                          <span className="text-xs font-normal text-muted-foreground uppercase tracking-wider">Premium Member</span>
                        </div>
                      </SheetTitle>
                    </SheetHeader>

                    <div className="flex flex-col h-full overflow-y-auto px-4 py-6 pb-20 custom-scrollbar">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">Apps</p>
                        {mobileDrawerItems.map((drawerItem) => {
                          const DrawerIcon = drawerItem.icon;
                          const isDrawerActive = activeByHref.has(drawerItem.href);
                          return (
                            <Link
                              key={drawerItem.href}
                              href={drawerItem.href}
                              onClick={() => setIsSheetOpen(false)}
                              className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors ${isDrawerActive
                                ? 'text-primary bg-primary/10 border border-primary/20'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                            >
                              <DrawerIcon className="w-5 h-5" />
                              <span className="text-sm font-medium">{drawerItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>

                      <div className="mt-8 space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">Preferences</p>

                        <div className="flex items-center justify-between px-3 py-3 rounded-lg text-muted-foreground hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            <span className="text-sm font-medium">Dark Mode</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="h-6 w-10 p-0"
                          >
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-muted'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-4.5' : 'left-0.5'}`} />
                            </div>
                          </Button>
                        </div>

                        <button
                          onClick={() => logout()}
                          className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <LogOut className="w-5 h-5" />
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
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-all duration-200 active:scale-95 ${isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Top Bar (Clean) */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-40 border-b border-border bg-background lg:hidden px-4 h-12 flex items-center justify-between transition-all duration-300",
        pathname === '/dashboard' ? "opacity-0 invisible pointer-events-none h-0" : "opacity-100 visible h-12"
      )}>
        <div className="flex items-center gap-2">
          <div className="size-7 flex items-center justify-center shrink-0">
            <img src="/icon-removebg-preview.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-foreground leading-none">Vishnu Finance</span>
        </div>
        <div className="w-7"></div>
      </div>
    </>
  );
}
