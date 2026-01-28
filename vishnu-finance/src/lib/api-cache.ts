// High-performance API caching and optimization utilities
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Use a temp directory for caching to persist across server restarts (but not indefinitely)
const CACHE_DIR = path.join(os.tmpdir(), 'vishnu-finance-cache');

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create cache directory:', error);
  }
}

// Initialize cache dir
ensureCacheDir();

// Cache configuration
export const CACHE_TTL = {
  DASHBOARD: 30000,    // 30 seconds
  ANALYTICS: 60000,    // 1 minute
  STATIC_DATA: 300000, // 5 minutes
  USER_DATA: 15000,    // 15 seconds
  LONG_LIVED: 3600000, // 1 hour (for heavy calculations like AI advice)
} as const;

// Cache metrics for monitoring
let cacheHits = 0;
let cacheMisses = 0;

interface CacheOptions {
  ttl?: number;
  key?: string;
  skipCache?: boolean;
}

// Generate unique filename for cache key
function getCacheFilePath(key: string): string {
  // sanitize key to be safe for filename
  const safeKey = key.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return path.join(CACHE_DIR, `${safeKey}.json`);
}

// Get cached data from file
export async function getCachedData(key: string): Promise<any | null> {
  try {
    const filePath = getCacheFilePath(key);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      cacheMisses++;
      return null;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const entry = JSON.parse(content);

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Expired - try to delete relevant file
      try { await fs.unlink(filePath); } catch { }
      cacheMisses++;
      return null;
    }

    cacheHits++;
    return entry.data;
  } catch (error) {
    console.error(`Cache read error for key ${key}:`, error);
    cacheMisses++;
    return null;
  }
}

// Set cached data to file
export async function setCachedData(key: string, data: any, ttl: number): Promise<void> {
  try {
    await ensureCacheDir();
    const filePath = getCacheFilePath(key);

    const entry = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
  } catch (error) {
    console.error(`Cache write error for key ${key}:`, error);
  }
}

// Clear cache for key prefix (e.g. userId) produces multiple files
// This is slower with files, so we iterate directory
export async function clearUserCache(userId: string): Promise<void> {
  try {
    const files = await fs.readdir(CACHE_DIR);
    for (const file of files) {
      if (file.includes(userId.toLowerCase())) { // Simple robust check
        await fs.unlink(path.join(CACHE_DIR, file)).catch(() => { });
      }
    }
  } catch (error) {
    console.error('Error clearing user cache:', error);
  }
}


// -- Unchanged / Helper Utilities --

// Generate cache key from request (sync helper)
export function generateCacheKey(request: NextRequest, customKey?: string): string {
  if (customKey) return customKey;

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const period = url.searchParams.get('period');
  const type = url.searchParams.get('type');

  return `${url.pathname}:${userId}:${period}:${type}`;
}


type CacheHandler = (
  request: NextRequest,
  ...args: any[]
) => Promise<NextResponse | Response> | NextResponse | Response;

// Cache middleware for API routes - updated to be async compatible
export function withCache(options: CacheOptions = {}) {
  return function (handler: CacheHandler): CacheHandler {
    return async function (request: NextRequest, ...args: any[]) {
      if (options.skipCache) {
        return handler(request, ...args);
      }

      const cacheKey = generateCacheKey(request, options.key);
      const cachedData = await getCachedData(cacheKey);

      if (cachedData) {
        return NextResponse.json(cachedData);
      }

      const response = await handler(request, ...args);

      if (response instanceof NextResponse && response.ok) {
        // Clone response to read body
        const cloned = response.clone();
        try {
          const data = await cloned.json();
          await setCachedData(cacheKey, data, options.ttl || CACHE_TTL.DASHBOARD);
        } catch (e) {
          // response might not be json
        }
      }

      return response;
    };
  };
}

// Batch operations utility (Unchanged logic)
export class BatchOperations {
  private static operations: Map<string, Promise<any>[]> = new Map();

  static addOperation(userId: string, operation: Promise<any>): void {
    if (!this.operations.has(userId)) {
      this.operations.set(userId, []);
    }
    this.operations.get(userId)!.push(operation);
  }

  static async executeBatch(userId: string): Promise<any[]> {
    const operations = this.operations.get(userId) || [];
    this.operations.delete(userId);

    if (operations.length === 0) return [];

    try {
      return await Promise.all(operations);
    } catch (error) {
      console.error('Batch operation failed:', error);
      throw error;
    }
  }
}

// Performance monitoring (Unchanged)
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static startTimer(operation: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);

      if (duration > 1000) {
        console.warn(`🐌 Slow operation: ${operation} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  static recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
  }

  static getAverageTime(operation: string): number {
    const times = this.metrics.get(operation) || [];
    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  static getMetrics(): Record<string, { avg: number; count: number; max: number }> {
    const result: Record<string, { avg: number; count: number; max: number }> = {};

    for (const [operation, times] of this.metrics.entries()) {
      result[operation] = {
        avg: this.getAverageTime(operation),
        count: times.length,
        max: Math.max(...times),
      };
    }

    return result;
  }
}

// Database query optimization (Unchanged)
export class QueryOptimizer {
  static async batchUserQueries(userId: string, queries: Array<() => Promise<any>>): Promise<any[]> {
    const timer = PerformanceMonitor.startTimer('batch_user_queries');

    try {
      const results = await Promise.all(queries.map(query => query()));
      timer();
      return results;
    } catch (error) {
      timer();
      throw error;
    }
  }

  // Kept for backward compatibility, but in reality we should use specific service calls
  static async optimizedDashboardData(userId: string) {
    const timer = PerformanceMonitor.startTimer('dashboard_data_fetch');
    // ... Simplified implementation as logic is moved to services ... 
    return {};
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const files = await fs.readdir(CACHE_DIR);
    for (const file of files) {
      await fs.unlink(path.join(CACHE_DIR, file)).catch(() => { });
    }
    console.log('✅ All API cache cleared');
  } catch (e) {
    console.error('Error clearing all cache', e);
  }
}

export function getCacheStats(): any {
  return {
    hits: cacheHits,
    misses: cacheMisses,
    type: 'file-system',
    path: CACHE_DIR
  };
}

export function resetCacheMetrics(): void {
  cacheHits = 0;
  cacheMisses = 0;
}
