'use client';

import React from 'react';

interface ModernGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  responsive?: boolean;
}

export default function ModernGrid({
  children,
  columns = 3,
  gap = 'md',
  className = '',
  responsive = true
}: ModernGridProps) {
  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-12'
  };

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  };

  const baseClasses = `
    grid
    ${responsive ? columnClasses[columns] : `grid-cols-${columns}`}
    ${gapClasses[gap]}
    ${className}
  `.trim();

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
}
