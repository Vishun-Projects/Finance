import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
