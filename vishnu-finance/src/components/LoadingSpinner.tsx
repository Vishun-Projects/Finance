import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {text && (
        <p className="mt-2 text-sm text-muted">{text}</p>
      )}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" text="Loading..." />
        <p className="mt-4 text-lg font-medium text-gray-900">Vishnu Finance</p>
        <p className="text-sm text-muted">Personal Finance Manager</p>
      </div>
    </div>
  );
}

export function InlineLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center space-x-2 text-sm text-muted">
      <LoadingSpinner size="sm" />
      <span>{text}</span>
    </div>
  );
}
