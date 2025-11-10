import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  text?: string;
  className?: string;
}

const sizeToClasses: Record<SpinnerSize, { spinner: string; text: string }> = {
  sm: { spinner: 'h-4 w-4 border-2', text: 'text-sm' },
  md: { spinner: 'h-6 w-6 border-2', text: 'text-base' },
  lg: { spinner: 'h-8 w-8 border-3', text: 'text-lg' },
};

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const classes = sizeToClasses[size];
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`animate-spin rounded-full border-gray-300 border-t-gray-900 ${classes.spinner}`}></div>
      {text ? <span className={`text-gray-600 ${classes.text}`}>{text}</span> : null}
    </div>
  );
}

export default LoadingSpinner;


