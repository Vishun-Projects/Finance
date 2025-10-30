'use client';

import React from 'react';
import { useLoading } from '@/contexts/LoadingContext';

export default function GlobalPreloader() {
  const { isLoading, loadingMessage } = useLoading();
  
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        {/* Modern Spinner */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        {/* Loading Text */}
        <div className="text-center">
          <p className="text-gray-900 font-medium text-lg">{loadingMessage}</p>
          <p className="text-gray-600 text-sm mt-1">Please wait while we load your data</p>
        </div>
        
        {/* Progress Dots */}
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}
