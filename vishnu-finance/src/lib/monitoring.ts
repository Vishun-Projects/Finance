// Performance monitoring and analytics system
import { NextRequest } from 'next/server';

// Performance metrics store (in production, use a proper monitoring service)
const metricsStore = new Map<string, {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  errors: number;
  lastUpdated: number;
}>();

// Error tracking store
const errorStore = new Map<string, {
  count: number;
  lastOccurred: Date;
  stack?: string;
  context?: any;
}>();

// User analytics store
const userAnalyticsStore = new Map<string, {
  pageViews: number;
  sessionDuration: number;
  lastActivity: Date;
  features: Set<string>;
}>();

// Performance monitoring class
export class PerformanceMonitor {
  // Track API endpoint performance
  static trackEndpoint(endpoint: string, duration: number, success: boolean = true) {
    const key = `endpoint:${endpoint}`;
    const existing = metricsStore.get(key) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0,
      lastUpdated: Date.now(),
    };

    existing.count++;
    existing.totalTime += duration;
    existing.minTime = Math.min(existing.minTime, duration);
    existing.maxTime = Math.max(existing.maxTime, duration);
    existing.lastUpdated = Date.now();

    if (!success) {
      existing.errors++;
    }

    metricsStore.set(key, existing);

    // Log slow endpoints
    if (duration > 1000) {
      console.warn(`🐌 Slow endpoint: ${endpoint} took ${duration.toFixed(2)}ms`);
    }
  }

  // Track database query performance
  static trackQuery(query: string, duration: number, success: boolean = true) {
    const key = `query:${query.substring(0, 50)}`;
    const existing = metricsStore.get(key) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0,
      lastUpdated: Date.now(),
    };

    existing.count++;
    existing.totalTime += duration;
    existing.minTime = Math.min(existing.minTime, duration);
    existing.maxTime = Math.max(existing.maxTime, duration);
    existing.lastUpdated = Date.now();

    if (!success) {
      existing.errors++;
    }

    metricsStore.set(key, existing);

    // Log slow queries
    if (duration > 500) {
      console.warn(`🐌 Slow query: ${query.substring(0, 100)} took ${duration.toFixed(2)}ms`);
    }
  }

  // Track user interactions
  static trackUserInteraction(userId: string, action: string, _metadata?: any) {
    void _metadata;
    const key = `user:${userId}`;
    const existing = userAnalyticsStore.get(key) || {
      pageViews: 0,
      sessionDuration: 0,
      lastActivity: new Date(),
      features: new Set<string>(),
    };

    existing.lastActivity = new Date();
    existing.features.add(action);

    if (action === 'page_view') {
      existing.pageViews++;
    }

    userAnalyticsStore.set(key, existing);
  }

  // Track errors
  static trackError(error: Error, context?: any) {
    const key = error.message.substring(0, 100);
    const existing = errorStore.get(key) || {
      count: 0,
      lastOccurred: new Date(),
      stack: error.stack,
      context,
    };

    existing.count++;
    existing.lastOccurred = new Date();

    errorStore.set(key, existing);

    // Log critical errors
    if (existing.count === 1 || existing.count % 10 === 0) {
      console.error(`🚨 Error tracked: ${error.message}`, {
        count: existing.count,
        context,
        stack: error.stack,
      });
    }
  }

  // Get performance metrics
  static getMetrics() {
    const metrics: Record<string, any> = {};

    for (const [key, data] of metricsStore.entries()) {
      metrics[key] = {
        count: data.count,
        avgTime: data.totalTime / data.count,
        minTime: data.minTime === Infinity ? 0 : data.minTime,
        maxTime: data.maxTime,
        errorRate: (data.errors / data.count) * 100,
        lastUpdated: new Date(data.lastUpdated),
      };
    }

    return metrics;
  }

  // Get error summary
  static getErrorSummary() {
    const errors: Record<string, any> = {};

    for (const [key, data] of errorStore.entries()) {
      errors[key] = {
        count: data.count,
        lastOccurred: data.lastOccurred,
        context: data.context,
      };
    }

    return errors;
  }

  // Get user analytics
  static getUserAnalytics() {
    const analytics: Record<string, any> = {};

    for (const [key, data] of userAnalyticsStore.entries()) {
      analytics[key] = {
        pageViews: data.pageViews,
        sessionDuration: data.sessionDuration,
        lastActivity: data.lastActivity,
        featuresUsed: Array.from(data.features),
      };
    }

    return analytics;
  }

  // Get system health
  static getSystemHealth() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    let totalRequests = 0;
    let totalErrors = 0;
    let avgResponseTime = 0;
    let slowEndpoints = 0;

    for (const [key, data] of metricsStore.entries()) {
      if (key.startsWith('endpoint:') && data.lastUpdated > oneHourAgo) {
        totalRequests += data.count;
        totalErrors += data.errors;
        avgResponseTime += data.totalTime;
        
        if (data.totalTime / data.count > 1000) {
          slowEndpoints++;
        }
      }
    }

    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    const avgTime = totalRequests > 0 ? avgResponseTime / totalRequests : 0;

    return {
      status: errorRate > 10 || avgTime > 2000 ? 'unhealthy' : 'healthy',
      totalRequests,
      errorRate: errorRate.toFixed(2),
      avgResponseTime: avgTime.toFixed(2),
      slowEndpoints,
      timestamp: new Date(),
    };
  }
}

// Performance middleware
type MonitoringHandler<TArgs extends any[], TResult> = (request: NextRequest, ...args: TArgs) => Promise<TResult> | TResult;

export function performanceMiddleware<TArgs extends any[], TResult>(handler: MonitoringHandler<TArgs, TResult>) {
  return async function (request: NextRequest, ...args: TArgs): Promise<TResult> {
    const startTime = performance.now();
    const endpoint = `${request.method} ${request.nextUrl.pathname}`;
    
    try {
      const response = await handler(request, ...args);
      const duration = performance.now() - startTime;
      
      PerformanceMonitor.trackEndpoint(endpoint, duration, true);
      
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      PerformanceMonitor.trackEndpoint(endpoint, duration, false);
      PerformanceMonitor.trackError(error as Error, {
        endpoint,
        method: request.method,
        url: request.url,
      });
      
      throw error;
    }
  };
}

// User analytics middleware
export function userAnalyticsMiddleware<TArgs extends any[], TResult>(handler: MonitoringHandler<TArgs, TResult>) {
  return async function (request: NextRequest, ...args: TArgs): Promise<TResult> {
    const userId = request.headers.get('x-user-id');
    const endpoint = request.nextUrl.pathname;
    
    if (userId) {
      PerformanceMonitor.trackUserInteraction(userId, 'api_call', {
        endpoint,
        method: request.method,
      });
    }
    
    return handler(request, ...args);
  };
}

// Real-time monitoring API
export async function getMonitoringData() {
  return {
    metrics: PerformanceMonitor.getMetrics(),
    errors: PerformanceMonitor.getErrorSummary(),
    userAnalytics: PerformanceMonitor.getUserAnalytics(),
    systemHealth: PerformanceMonitor.getSystemHealth(),
    timestamp: new Date(),
  };
}

// Cleanup old data periodically
setInterval(() => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  // Clean up old metrics
  for (const [key, data] of metricsStore.entries()) {
    if (data.lastUpdated < oneDayAgo) {
      metricsStore.delete(key);
    }
  }
  
  // Clean up old user analytics
  for (const [key, data] of userAnalyticsStore.entries()) {
    if (data.lastActivity.getTime() < oneDayAgo) {
      userAnalyticsStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

// Export monitoring utilities
export const monitoring = {
  trackEndpoint: PerformanceMonitor.trackEndpoint,
  trackQuery: PerformanceMonitor.trackQuery,
  trackUserInteraction: PerformanceMonitor.trackUserInteraction,
  trackError: PerformanceMonitor.trackError,
  getMetrics: PerformanceMonitor.getMetrics,
  getErrorSummary: PerformanceMonitor.getErrorSummary,
  getUserAnalytics: PerformanceMonitor.getUserAnalytics,
  getSystemHealth: PerformanceMonitor.getSystemHealth,
};
