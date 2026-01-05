'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home,
  TrendingUp,
  Settings,
  User,
  MessageSquare,
  Heart,
  CalendarCheck,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

const primaryNavItemsConfig = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/financial-health', label: 'Health Score', icon: Heart },
  { href: '/transactions', label: 'Transactions', icon: TrendingUp, tooltip: 'Manage all income, expenses, and transactions' },
  { href: '/plans', label: 'Plans', icon: CalendarCheck, tooltip: 'Goals, deadlines, and wishlist' },
  { href: '/advisor', label: 'AI Advisor', icon: MessageSquare, tooltip: 'Get personalized financial advice powered by AI' },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const desktopNavItems = primaryNavItemsConfig;

// Primary navigation items for mobile bottom bar (first 5 items)
const mobilePrimaryNavItems = primaryNavItemsConfig.slice(0, 5);

export default function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Logout helper closes any open menus
  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
  };

  const activeByHref = useMemo(() => {
    // Check for exact match or if pathname starts with the href
    return new Set(
      desktopNavItems.filter(item =>
        pathname === item.href || pathname.startsWith(item.href + '/')
      ).map(item => item.href)
    );
  }, [pathname]);

  // Close user menu when clicking outside
  useEffect(() => {
    if (isUserMenuOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.user-menu-container')) {
          setIsUserMenuOpen(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isUserMenuOpen]);

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm shadow-sm safe-top">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-14 min-h-[4rem] h-auto pt-[env(safe-area-inset-top)]">
          <div className="flex h-16 w-full items-center justify-between lg:h-16 xl:h-[68px]">
            {/* Logo and Brand */}
            <div className="flex items-center flex-shrink-0">
              <Link href="/dashboard" className="flex items-center space-x-2.5 group" aria-label="Go to dashboard">
                <div className="relative w-9 h-9 rounded-lg overflow-hidden shadow-sm border border-border">
                  <Image
                    src="/icon-removebg-preview.png"
                    alt="Vishnu Finance logo"
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    priority
                  />
                </div>
                <span className="hidden sm:block text-lg font-semibold text-foreground tracking-tight">Vishnu Finance</span>
              </Link>
            </div>

            {/* Desktop Navigation - Centered and properly spaced */}
            <div className="hidden lg:flex items-center gap-1 mx-auto" role="navigation" aria-label="Primary">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeByHref.has(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    title={item.tooltip || item.label}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-primary-foreground" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* User Menu and Logout */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Logout Button - Desktop only */}
              <button
                onClick={handleLogout}
                className="hidden lg:flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                aria-label="Sign out"
              >
                <span>Sign Out</span>
              </button>

              <div className="relative user-menu-container">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                >
                  <Avatar
                    src={user?.avatarUrl}
                    userId={user?.id || ''}
                    size="sm"
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border py-1.5 z-50 animate-in fade-in-0 zoom-in-95">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-foreground">{user?.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{user?.email || ''}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12l3-3m0 0l-3-3m3 3H9"
                        />
                      </svg>
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu removed: bottom bar handles navigation */}
            </div>
          </div>
        </div>
        {/* Mobile slide-down menu removed in favour of persistent bottom bar */}
      </nav>

      {/* Mobile Bottom Tab Bar - Only on mobile, shows primary navigation */}
      <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70 lg:hidden">
        <div className="mx-auto flex h-16 w-full max-w-screen-sm items-center justify-around gap-1 px-2 pb-[env(safe-area-inset-bottom)] sm:px-4">
          {mobilePrimaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeByHref.has(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-colors ${isActive
                  ? 'text-foreground bg-muted'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                aria-label={item.label}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label.split(' ')[0]}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for mobile bottom bar */}
      <div className="h-0 lg:h-0 pb-16 lg:pb-0" />
    </>
  );
}


