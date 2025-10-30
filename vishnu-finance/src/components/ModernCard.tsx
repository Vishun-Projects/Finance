'use client';

import React from 'react';

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  rounded?: 'sm' | 'md' | 'lg' | 'xl';
  shadow?: 'sm' | 'md' | 'lg' | 'xl' | 'none';
  border?: boolean;
  background?: 'white' | 'gray' | 'transparent';
}

export default function ModernCard({
  children,
  className = '',
  hover = true,
  padding = 'md',
  rounded = 'lg',
  shadow = 'md',
  border = true,
  background = 'white'
}: ModernCardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl'
  };

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    none: 'shadow-none'
  };

  const backgroundClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    transparent: 'bg-transparent'
  };

  const baseClasses = `
    ${paddingClasses[padding]}
    ${roundedClasses[rounded]}
    ${shadowClasses[shadow]}
    ${backgroundClasses[background]}
    ${border ? 'border border-gray-200' : ''}
    ${hover ? 'hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-in-out' : ''}
    ${className}
  `.trim();

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
}
