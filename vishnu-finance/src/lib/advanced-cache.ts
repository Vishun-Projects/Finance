// Advanced caching system with edge caching, compression, and intelligent invalidation
import { NextRequest } from 'next/server';

// Cache storage interfaces
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  etag: string;
  compressed?: boolean;
  metadata?: {
    size: number;
    hits: number;
    lastAccessed: number;
    tags: string[];
  };
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  compressionThreshold: number;
  enableCompression: boolean;
  enableLRU: boolean;
}

// Advanced cache implementation
export class AdvancedCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private config: CacheConfig;
  private totalSize = 0;
  private hitCount = 0;
  private missCount = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB
      defaultTTL: 300000, // 5 minutes
      compressionThreshold: 1024, // 1KB
      enableCompression: true,
      enableLRU: true,
      ...config
    };
  }

  // Set cache entry with advanced features
  set(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      tags?: string[];
      compress?: boolean;
    } = {}
  ): void {
    const { ttl = this.config.defaultTTL, tags = [], compress } = options;
    
    // Remove existing entry if it exists
    this.delete(key);

    // Prepare data
    let processedData = data;
    let compressed = false;
    
    if (this.config.enableCompression && 
        (compress || this.shouldCompress(data))) {
      processedData = this.compress(data) as T;
      compressed = true;
    }

    // Calculate size
    const size = this.calculateSize(processedData);
    
    // Check if we need to evict entries
    this.evictIfNeeded(size);

    // Create cache entry
    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: Date.now(),
      ttl,
      etag: this.generateETag(data),
      compressed,
      metadata: {
        size,
        hits: 0,
        lastAccessed: Date.now(),
        tags
      }
    };

    this.cache.set(key, entry);
    this.totalSize += size;
    
    if (this.config.enableLRU) {
      this.accessOrder.push(key);
    }
  }

  // Get cache entry with LRU tracking
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.missCount++;
      return null;
    }

    // Update access tracking
    entry.metadata!.hits++;
    entry.metadata!.lastAccessed = Date.now();
    this.hitCount++;

    // Update LRU order
    if (this.config.enableLRU) {
      this.updateAccessOrder(key);
    }

    // Decompress if needed
    if (entry.compressed) {
      return this.decompress(entry.data) as T;
    }

    return entry.data;
  }

  // Delete cache entry
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.totalSize -= entry.metadata!.size;
    this.cache.delete(key);
    
    if (this.config.enableLRU) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }

    return true;
  }

  // Invalidate by tags
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata?.tags.some(tag => tags.includes(tag))) {
        this.delete(key);
        invalidated++;
      }
    }
    
    return invalidated;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.totalSize = 0;
    this.hitCount = 0;
    this.missCount = 0;
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.totalSize,
      entries: this.cache.size,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
      hitCount: this.hitCount,
      missCount: this.missCount,
      averageEntrySize: this.totalSize / this.cache.size || 0
    };
  }

  // Private methods
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private shouldCompress(data: any): boolean {
    const size = this.calculateSize(data);
    return size > this.config.compressionThreshold;
  }

  private compress(data: any): any {
    // Simple compression simulation (in production, use actual compression)
    try {
      const jsonString = JSON.stringify(data);
      return btoa(jsonString); // Base64 encoding as simple compression
    } catch {
      return data;
    }
  }

  private decompress(data: any): any {
    try {
      const jsonString = atob(data); // Base64 decoding
      return JSON.parse(jsonString);
    } catch {
      return data;
    }
  }

  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate
    } catch {
      return 1024; // Default size
    }
  }

  private generateETag(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      let hash = 0;
      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash.toString(36);
    } catch {
      return Date.now().toString(36);
    }
  }

  private evictIfNeeded(newEntrySize: number): void {
    while (this.totalSize + newEntrySize > this.config.maxSize && this.cache.size > 0) {
      if (this.config.enableLRU && this.accessOrder.length > 0) {
        // Remove least recently used
        const oldestKey = this.accessOrder[0];
        this.delete(oldestKey);
      } else {
        // Remove oldest entry
        let oldestKey = '';
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.cache.entries()) {
          if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            oldestKey = key;
          }
        }
        
        if (oldestKey) {
          this.delete(oldestKey);
        } else {
          break; // Prevent infinite loop
        }
      }
    }
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
}

// Cache manager for different data types
export class CacheManager {
  private caches = new Map<string, AdvancedCache>();

  getCache<T>(name: string, config?: Partial<CacheConfig>): AdvancedCache<T> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new AdvancedCache<T>(config));
    }
    return this.caches.get(name) as AdvancedCache<T>;
  }

  // Predefined cache instances
  get dashboardCache() {
    return this.getCache('dashboard', {
      maxSize: 50 * 1024 * 1024, // 50MB
      defaultTTL: 30000, // 30 seconds
      enableCompression: true
    });
  }

  get analyticsCache() {
    return this.getCache('analytics', {
      maxSize: 100 * 1024 * 1024, // 100MB
      defaultTTL: 60000, // 1 minute
      enableCompression: true
    });
  }

  get userCache() {
    return this.getCache('user', {
      maxSize: 20 * 1024 * 1024, // 20MB
      defaultTTL: 300000, // 5 minutes
      enableCompression: false
    });
  }

  get staticCache() {
    return this.getCache('static', {
      maxSize: 200 * 1024 * 1024, // 200MB
      defaultTTL: 300000, // 5 minutes
      enableCompression: true
    });
  }

  // Clear all caches
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  // Get statistics for all caches
  getAllStats() {
    const stats: Record<string, any> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }
}

// Global cache manager
export const cacheManager = new CacheManager();

// Edge caching utilities
export class EdgeCache {
  private static readonly EDGE_HEADERS = {
    'Cache-Control': 'public, max-age=300, s-maxage=300',
    'CDN-Cache-Control': 'public, max-age=300',
    'Vary': 'Accept-Encoding, Authorization'
  };

  static setEdgeHeaders(response: Response, ttl: number = 300): Response {
    const headers = new Headers(response.headers);
    
    headers.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`);
    headers.set('CDN-Cache-Control', `public, max-age=${ttl}`);
    headers.set('Vary', 'Accept-Encoding, Authorization');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  static generateCacheKey(request: NextRequest, prefix: string = ''): string {
    const url = new URL(request.url);
    const userId = request.headers.get('x-user-id') || 'anonymous';
    const params = url.searchParams.toString();
    
    return `${prefix}:${userId}:${url.pathname}:${params}`;
  }

  static shouldCache(request: NextRequest): boolean {
    // Don't cache POST, PUT, DELETE requests
    if (request.method !== 'GET') return false;
    
    // Don't cache authenticated requests with sensitive data
    const url = new URL(request.url);
    if (url.pathname.includes('/api/auth/')) return false;
    
    return true;
  }
}

// Cache warming utilities
export class CacheWarmer {
  private warmingTasks = new Set<string>();

  async warmCache<T>(
    key: string,
    dataFetcher: () => Promise<T>,
    cache: AdvancedCache<T>,
    options: {
      ttl?: number;
      tags?: string[];
      retries?: number;
    } = {}
  ): Promise<void> {
    if (this.warmingTasks.has(key)) {
      return; // Already warming
    }

    this.warmingTasks.add(key);

    try {
      const data = await dataFetcher();
      cache.set(key, data, options);
    } catch (error) {
      console.error(`Cache warming failed for key: ${key}`, error);
    } finally {
      this.warmingTasks.delete(key);
    }
  }

  async warmMultiple<T>(
    tasks: Array<{
      key: string;
      dataFetcher: () => Promise<T>;
      cache: AdvancedCache<T>;
      options?: any;
    }>
  ): Promise<void> {
    await Promise.allSettled(
      tasks.map(task => 
        this.warmCache(task.key, task.dataFetcher, task.cache, task.options)
      )
    );
  }
}

// Global cache warmer
export const cacheWarmer = new CacheWarmer();

// Cache invalidation strategies
export class CacheInvalidation {
  static async invalidateUserData(userId: string): Promise<void> {
    // Invalidate user-specific caches
    cacheManager.userCache.delete(`user:${userId}`);
    cacheManager.dashboardCache.delete(`dashboard:${userId}`);
    cacheManager.analyticsCache.delete(`analytics:${userId}`);
  }

  static async invalidateByPattern(pattern: string): Promise<void> {
    // Invalidate caches matching pattern
    for (const [name, cache] of cacheManager['caches'].entries()) {
      // This would need to be implemented based on cache structure
      console.log(`Invalidating cache ${name} with pattern ${pattern}`);
    }
  }

  static async invalidateByTags(tags: string[]): Promise<void> {
    // Invalidate caches by tags
    for (const [name, cache] of cacheManager['caches'].entries()) {
      cache.invalidateByTags(tags);
    }
  }
}
