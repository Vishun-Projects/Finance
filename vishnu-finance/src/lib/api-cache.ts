// High-performance API caching and optimization utilities
import { NextRequest, NextResponse } from 'next/server';

// PERFORMANCE: In-memory cache with LRU eviction for API responses
// NOTE: For production scaling with multiple server instances, migrate to Redis:
// - Install: npm install ioredis
// - Use: Redis client with same API (get/set/del operations)
// - Benefits: Shared cache across instances, persistence, better memory management

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  lastAccessed: number; // For LRU eviction
}

const cache = new Map<string, CacheEntry>();

// Cache configuration
export const CACHE_TTL = {
  DASHBOARD: 30000,    // 30 seconds
  ANALYTICS: 60000,    // 1 minute
  STATIC_DATA: 300000, // 5 minutes
  USER_DATA: 15000,    // 15 seconds
} as const;

// PERFORMANCE: Cache size limits to prevent memory issues
const MAX_CACHE_SIZE = 1000; // Maximum number of cache entries

// Cache metrics for monitoring
let cacheHits = 0;
let cacheMisses = 0;

interface CacheOptions {
  ttl?: number;
  key?: string;
  skipCache?: boolean;
}

// Generate cache key from request
function generateCacheKey(request: NextRequest, customKey?: string): string {
  if (customKey) return customKey;
  
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const period = url.searchParams.get('period');
  const type = url.searchParams.get('type');
  
  return `${url.pathname}:${userId}:${period}:${type}`;
}

// Get cached data with LRU tracking
export function getCachedData(key: string): any | null {
  const cached = cache.get(key);
  if (!cached) {
    cacheMisses++;
    return null;
  }
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    cache.delete(key);
    cacheMisses++;
    return null;
  }
  
  // Update last accessed time for LRU
  cached.lastAccessed = now;
  cache.set(key, cached);
  cacheHits++;
  
  return cached.data;
}

// Set cached data with LRU eviction
export function setCachedData(key: string, data: any, ttl: number): void {
  const now = Date.now();
  
  // PERFORMANCE: Evict entries if cache is too large
  if (cache.size >= MAX_CACHE_SIZE) {
    evictLRUEntries(Math.floor(MAX_CACHE_SIZE * 0.2)); // Evict 20% oldest entries
  }
  
  cache.set(key, {
    data,
    timestamp: now,
    ttl,
    lastAccessed: now,
  });
}

// LRU Eviction: Remove least recently used entries
function evictLRUEntries(count: number): void {
  const entries = Array.from(cache.entries())
    .map(([key, entry]) => ({ key, lastAccessed: entry.lastAccessed }))
    .sort((a, b) => a.lastAccessed - b.lastAccessed); // Sort by last accessed (oldest first)
  
  // Remove oldest entries
  for (let i = 0; i < Math.min(count, entries.length); i++) {
    cache.delete(entries[i].key);
  }
  
  if (count > 0) {
    console.log(`🧹 Cache eviction: Removed ${Math.min(count, entries.length)} LRU entries`);
  }
}

// Clear cache for user
export function clearUserCache(userId: string): void {
  for (const [key] of cache.entries()) {
    if (key.includes(userId)) {
      cache.delete(key);
    }
  }
}

type CacheHandler = (
  request: NextRequest,
  ...args: any[]
) => Promise<NextResponse | Response> | NextResponse | Response;

// Cache middleware for API routes
export function withCache(options: CacheOptions = {}) {
  return function (handler: CacheHandler): CacheHandler {
    return async function (request: NextRequest, ...args: any[]) {
      if (options.skipCache) {
        return handler(request, ...args);
      }
      
      const cacheKey = generateCacheKey(request, options.key);
      const cachedData = getCachedData(cacheKey);
      
      if (cachedData) {
        return NextResponse.json(cachedData);
      }
      
      const response = await handler(request, ...args);
      
      if (response instanceof NextResponse && response.ok) {
        const data = await response.clone().json();
        setCachedData(cacheKey, data, options.ttl || CACHE_TTL.DASHBOARD);
      }
      
      return response;
    };
  };
}

// Batch operations utility
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

// Performance monitoring
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

// Database query optimization
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
  
  static async optimizedDashboardData(userId: string) {
    const timer = PerformanceMonitor.startTimer('dashboard_data_fetch');
    
    try {
      // Batch all dashboard queries
      const queries = [
        () => import('@/lib/db').then(({ prisma }) => 
          prisma.incomeSource.findMany({
            where: { userId },
            select: { id: true, amount: true, startDate: true, name: true },
            orderBy: { startDate: 'desc' },
            take: 50, // Limit for performance
          })
        ),
        () => import('@/lib/db').then(({ prisma }) => 
          prisma.expense.findMany({
            where: { userId },
            select: { id: true, amount: true, date: true, description: true },
            orderBy: { date: 'desc' },
            take: 50, // Limit for performance
          })
        ),
        () => import('@/lib/db').then(({ prisma }) => 
          prisma.goal.findMany({
            where: { userId, isActive: true },
            select: { id: true, title: true, targetAmount: true, currentAmount: true, targetDate: true },
          })
        ),
        () => import('@/lib/db').then(({ prisma }) => 
          prisma.deadline.findMany({
            where: { 
              userId,
              dueDate: { gte: new Date() },
              isCompleted: false,
            },
            select: { id: true, title: true, dueDate: true, amount: true },
            orderBy: { dueDate: 'asc' },
            take: 10, // Only upcoming deadlines
          })
        ),
      ];
      
      const [income, expenses, goals, deadlines] = await this.batchUserQueries(userId, queries);
      timer();
      
      return { income, expenses, goals, deadlines };
    } catch (error) {
      timer();
      throw error;
    }
  }
}

// Clear all cache entries
export function clearAllCache(): void {
  cache.clear();
  console.log('✅ All API cache cleared');
}

// Get cache statistics with hit/miss metrics
export function getCacheStats(): { 
  size: number; 
  entries: string[];
  hits: number;
  misses: number;
  hitRate: number;
  maxSize: number;
} {
  const totalRequests = cacheHits + cacheMisses;
  const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
  
  return {
    size: cache.size,
    entries: Array.from(cache.keys()),
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: Math.round(hitRate * 100) / 100,
    maxSize: MAX_CACHE_SIZE,
  };
}

// Reset cache metrics (for testing/monitoring)
export function resetCacheMetrics(): void {
  cacheHits = 0;
  cacheMisses = 0;
}

// Cleanup old cache entries periodically (TTL-based) and enforce size limits
setInterval(() => {
  const now = Date.now();
  let expiredCount = 0;
  
  // Remove expired entries
  for (const [key, cached] of cache.entries()) {
    if (now - cached.timestamp > cached.ttl) {
      cache.delete(key);
      expiredCount++;
    }
  }
  
  // If still over limit after TTL cleanup, use LRU eviction
  if (cache.size > MAX_CACHE_SIZE) {
    const toEvict = cache.size - MAX_CACHE_SIZE;
    evictLRUEntries(toEvict);
  }
  
  if (expiredCount > 0 || cache.size > MAX_CACHE_SIZE) {
    console.log(`🧹 Cache cleanup: Removed ${expiredCount} expired entries, current size: ${cache.size}/${MAX_CACHE_SIZE}`);
  }
}, 60000); // Cleanup every minute
