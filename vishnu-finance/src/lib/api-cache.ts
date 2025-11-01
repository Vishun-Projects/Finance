// High-performance API caching and optimization utilities
import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for API responses (in production, use Redis)
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache configuration
export const CACHE_TTL = {
  DASHBOARD: 30000,    // 30 seconds
  ANALYTICS: 60000,    // 1 minute
  STATIC_DATA: 300000, // 5 minutes
  USER_DATA: 15000,    // 15 seconds
} as const;

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

// Get cached data
export function getCachedData(key: string): any | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

// Set cached data
export function setCachedData(key: string, data: any, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

// Clear cache for user
export function clearUserCache(userId: string): void {
  for (const [key] of cache.entries()) {
    if (key.includes(userId)) {
      cache.delete(key);
    }
  }
}

// Cache middleware for API routes
export function withCache(options: CacheOptions = {}) {
  return function (handler: Function) {
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

// Get cache statistics
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: cache.size,
    entries: Array.from(cache.keys())
  };
}

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of cache.entries()) {
    if (now - cached.timestamp > cached.ttl) {
      cache.delete(key);
    }
  }
}, 60000); // Cleanup every minute
