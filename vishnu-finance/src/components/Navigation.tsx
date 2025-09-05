'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar, 
  BarChart3, 
  Gift, 
  Settings,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/income', label: 'Income', icon: TrendingUp },
  { href: '/expenses', label: 'Expenses', icon: TrendingDown },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/deadlines', label: 'Deadlines', icon: Calendar },
  { href: '/wishlist', label: 'Wishlist', icon: Gift },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Navigation() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
  };

  return (
    <nav className="nav-top fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2 hover-lift transition-smooth">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-soft">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-primary">Vishnu Finance</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-item hover-lift transition-smooth focus-ring"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent transition-smooth focus-ring"
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-soft">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden md:block text-sm font-medium text-foreground">
                  {user?.name || 'User'}
                </span>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-strong border border-border py-1 z-50 fade-in">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium text-card-foreground">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-foreground hover:bg-accent transition-fast"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent transition-fast"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-accent transition-smooth focus-ring"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4 slide-in">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="nav-item hover-lift transition-smooth focus-ring"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
