'use client';

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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="flex space-x-3">
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Stats Skeleton */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(statsCount)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search and Filters Skeleton */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 animate-pulse">
          <div className="h-10 bg-gray-200 rounded flex-1"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      )}

      {/* List Skeleton */}
      {showList && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[...Array(listItemsCount)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
