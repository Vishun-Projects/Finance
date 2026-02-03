'use client';

import React from 'react';
import { useLoading } from '@/contexts/LoadingContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function GlobalPreloader() {
  const { isLoading, loadingMessage } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center space-y-6 max-w-sm w-full p-8 p-12">
        {/* Logo Placeholder Skeleton */}
        <Skeleton className="w-16 h-16 rounded-full" />

        <div className="space-y-3 w-full flex flex-col items-center">
          {/* Title Skeleton */}
          <Skeleton className="h-6 w-3/4 rounded-lg" />
          {/* Subtext Skeleton */}
          <Skeleton className="h-4 w-1/2 rounded-lg opacity-70" />
        </div>

        {/* Loading Text Overlay (Visible) */}
        <div className="text-center mt-4">
          {loadingMessage && (
            <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-widest uppercase">
              {loadingMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


