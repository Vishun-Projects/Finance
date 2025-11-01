import { NextRequest, NextResponse } from 'next/server';
import { clearAllCache, getCacheStats } from '@/lib/api-cache';
import { cacheManager } from '@/lib/advanced-cache';
import { clearCurrencyRatesCache, getCurrencyCacheStats } from '@/app/api/currency-rates/route';

/**
 * API endpoint to clear all application caches
 * 
 * Usage:
 * - GET /api/clear-cache - Clear all caches
 * - GET /api/clear-cache?stats=true - Get cache statistics before clearing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showStats = searchParams.get('stats') === 'true';

    const clearedCaches: string[] = [];
    const stats: Record<string, any> = {};

    // Get stats before clearing (if requested)
    if (showStats) {
      const apiCacheStats = getCacheStats();
      stats.apiCache = {
        size: apiCacheStats.size,
        entryCount: apiCacheStats.entries.length
      };

      try {
        stats.advancedCache = cacheManager.getAllStats();
      } catch (error) {
        console.error('Error getting advanced cache stats:', error);
      }

      stats.currencyRates = getCurrencyCacheStats();
    }

    // Clear API cache (from api-cache.ts)
    try {
      const beforeSize = getCacheStats().size;
      clearAllCache();
      clearedCaches.push(`API Cache (${beforeSize} entries)`);
    } catch (error) {
      console.error('Error clearing API cache:', error);
    }

    // Clear Advanced Cache Manager caches
    try {
      const beforeStats = cacheManager.getAllStats();
      const totalEntries = Object.values(beforeStats).reduce((sum: number, stat: any) => {
        return sum + (stat.entries || 0);
      }, 0);
      
      cacheManager.clearAll();
      clearedCaches.push(`Advanced Cache Manager (${totalEntries} entries)`);
    } catch (error) {
      console.error('Error clearing advanced cache:', error);
    }

    // Clear Currency Rates cache
    try {
      const hadCache = getCurrencyCacheStats().hasCache;
      clearCurrencyRatesCache();
      if (hadCache) {
        clearedCaches.push('Currency Rates Cache');
      }
    } catch (error) {
      console.error('Error clearing currency rates cache:', error);
    }

    // Response
    const response = {
      success: true,
      message: 'All caches cleared successfully',
      cleared: clearedCaches,
      timestamp: new Date().toISOString(),
      ...(showStats && { beforeClear: stats })
    };

    console.log('🧹 Cache cleared:', {
      clearedCaches: clearedCaches.length,
      timestamp: response.timestamp
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cache',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}

