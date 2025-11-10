import React from 'react';

interface PageSkeletonProps {
  showHeader?: boolean;
  showStats?: boolean;
  showFilters?: boolean;
  showList?: boolean;
  statsCount?: number;
  listItemsCount?: number;
}

export default function PageSkeleton({
  showHeader = true,
  showStats = true,
  showFilters = true,
  showList = true,
  statsCount = 3,
  listItemsCount = 5
}: PageSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      {showHeader && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 animate-pulse">
          <div>
            <div className="h-8 w-64 rounded-lg bg-muted/70 mb-2" />
            <div className="h-4 w-80 max-w-full rounded bg-muted/60" />
          </div>
          <div className="flex space-x-3">
            <div className="h-10 w-24 rounded-md bg-muted/60" />
            <div className="h-10 w-32 rounded-md bg-muted/60" />
          </div>
        </div>
      )}

      {/* Stats Skeleton */}
      {showStats && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[...Array(statsCount)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border/70 bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="mb-2 h-3.5 w-24 rounded bg-muted/60" />
                  <div className="h-8 w-28 rounded bg-muted/70" />
                </div>
                <div className="h-12 w-12 rounded-lg bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search and Filters Skeleton */}
      {showFilters && (
        <div className="flex flex-col gap-4 sm:flex-row animate-pulse">
          <div className="h-10 flex-1 rounded-md bg-muted/60" />
          <div className="h-10 w-32 rounded-md bg-muted/50" />
          <div className="h-10 w-32 rounded-md bg-muted/50" />
        </div>
      )}

      {/* List Skeleton */}
      {showList && (
        <div className="animate-pulse rounded-xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="mb-6 h-5 w-48 rounded bg-muted/60" />
          <div className="space-y-4">
            {[...Array(listItemsCount)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-muted/60" />
                <div className="flex-1">
                  <div className="mb-2 h-4 w-3/4 rounded bg-muted/60" />
                  <div className="h-3 w-1/2 rounded bg-muted/50" />
                </div>
                <div className="h-4 w-20 rounded bg-muted/50" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
