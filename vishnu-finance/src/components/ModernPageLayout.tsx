'use client';

import React from 'react';
import ModernCard from './ModernCard';

interface ModernPageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'sm' | 'md' | 'lg';
}

export default function ModernPageLayout({
  children,
  title,
  subtitle,
  actions,
  className = '',
  maxWidth = 'full',
  padding = 'md'
}: ModernPageLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  const paddingClasses = {
    sm: 'px-4 py-6',
    md: 'px-6 py-8',
    lg: 'px-8 py-12'
  };

  const baseClasses = `
    ${maxWidthClasses[maxWidth]}
    ${paddingClasses[padding]}
    mx-auto
    ${className}
  `.trim();

  return (
    <div className={baseClasses}>
      {/* Header */}
      {(title || subtitle || actions) && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-lg text-gray-600">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center space-x-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
