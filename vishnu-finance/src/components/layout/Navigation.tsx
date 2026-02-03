'use client';

import React, { useMemo } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Map user's requested icons to Lucide equivalent
const primaryNavItemsConfig = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/financial-health', label: 'Health Score', icon: Heart },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/plans', label: 'Plans', icon: Layers },
  { href: '/salary', label: 'Salary', icon: Wallet },
  { href: '/education', label: 'Knowledge Hub', icon: BookOpen },
  { href: '/advisor', label: 'AI Advisor', icon: Brain },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const mobilePrimaryNavItems = primaryNavItemsConfig.slice(0, 5);

export default function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const activeByHref = useMemo(() => {
    return new Set(
      primaryNavItemsConfig
        .filter(item => pathname === item.href || pathname.startsWith(item.href + '/'))
        .map(item => item.href)
    );
  }, [pathname]);

  const isAdmin = user?.role === 'SUPERUSER';

  return (
    <>
      {/* Desktop Sidebar - Matches User Design */}
      <aside className="hidden lg:flex w-64 border-r border-border flex-col py-8 px-6 bg-sidebar shrink-0 h-full z-50">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-12">
          <div className="size-8 flex items-center justify-center shrink-0">
            <img src="/icon-removebg-preview.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">Vishnu Finance</span>
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
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${isActive
                  ? 'text-primary bg-primary/10 border border-primary/20 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                <Icon className="w-6 h-6 font-light stroke-[1.5]" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}

        </nav>


        {/* Profile Footer */}
        <div className="mt-auto pt-6 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full text-left outline-none group">
                <div className="size-10 rounded-full border border-border flex items-center justify-center overflow-hidden shrink-0 transition-all">
                  {user?.avatarUrl ? (
                    <img alt="Profile" className="size-full object-cover" src={user.avatarUrl} />
                  ) : (
                    <div className="size-full bg-muted flex items-center justify-center text-muted-foreground">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold truncate text-foreground">{user?.name || 'User'}</span>
                  <div className="flex">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-foreground text-background font-bold uppercase tracking-tighter">Premium Member</span>
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

      {/* Mobile Bottom Tab Bar (Preserved) */}
      <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-16 w-full max-w-screen-sm items-center justify-around gap-1 px-2 pb-[env(safe-area-inset-bottom)] sm:px-4">
          {mobilePrimaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeByHref.has(item.href);
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

      {/* Mobile Top Bar (Updated) */}
      <div className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur lg:hidden px-4 h-14 flex items-center justify-center">
        <span className="text-sm font-bold tracking-widest uppercase text-foreground">Vishnu Finance</span>
      </div>
    </>
  );
}


