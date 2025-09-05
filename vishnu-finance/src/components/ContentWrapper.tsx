'use client';

import React from 'react';
import { useLayout } from '../contexts/LayoutContext';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from './LoadingSpinner';

interface ContentWrapperProps {
  children: React.ReactNode;
}

export function ContentWrapper({ children }: ContentWrapperProps) {
  const { layout, isLoading: layoutLoading } = useLayout();
  const { isLoading: themeLoading } = useTheme();
  
  // Show loading state while preferences are being fetched
  if (layoutLoading || themeLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading preferences..." />
      </div>
    );
  }
  
  return (
    <div className={`flex-1 ${layout === 'top' ? 'ml-0' : 'ml-64'}`}>
      <main className={`content-wrapper ${layout === 'top' ? 'top-navbar' : ''}`}>
        {children}
      </main>
    </div>
  );
}
