import { NextRequest, NextResponse } from 'next/server';
import { getCachedData, setCachedData, CACHE_TTL } from '../../../lib/api-cache';
import { dashboardService } from '../../../lib/dashboard-service';

// Cache key generator
function getCacheKey(userId: string, start: string, end: string): string {
  return `dashboard-simple:${userId}:${start}:${end}`;
}

// Configure route caching - user-specific dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Read optional date range; default to current month
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let rangeStart = startParam ? new Date(startParam) : defaultStart;
    let rangeEnd = endParam ? new Date(endParam) : defaultEnd;

    // Validate dates
    if (isNaN(rangeStart.getTime())) {
      console.warn('⚠️ Invalid start date provided, using default');
      rangeStart = defaultStart;
    }
    if (isNaN(rangeEnd.getTime())) {
      console.warn('⚠️ Invalid end date provided, using default');
      rangeEnd = defaultEnd;
    }

    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(23, 59, 59, 999);

    // Check cache first
    const cacheKey = getCacheKey(userId, rangeStart.toISOString(), rangeEnd.toISOString());
    const cached = getCachedData(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch data from Service
    const result = await dashboardService.getSimpleStats({
      userId,
      startDate: rangeStart,
      endDate: rangeEnd
    });

    // Cache for 30 seconds
    setCachedData(cacheKey, result, CACHE_TTL.DASHBOARD);

    // Add cache-control headers for client-side caching
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('❌ Error in simple dashboard API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}