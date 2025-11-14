// Security utilities for rate limiting, input validation, and security headers
import { NextRequest, NextResponse } from 'next/server';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  AUTH: { requests: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  API: { requests: 100, window: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  DASHBOARD: { requests: 50, window: 60 * 1000 }, // 50 requests per minute
} as const;

// Rate limiting middleware
type SecurityHandler = (
  request: NextRequest,
  ...args: any[]
) => Promise<NextResponse | Response> | NextResponse | Response;

export function rateLimit(limitType: keyof typeof RATE_LIMITS) {
  return function (handler: SecurityHandler): SecurityHandler {
    return async function (request: NextRequest, ...args: any[]): Promise<NextResponse | Response> {
      const ip = resolveClientIp(request);
      const key = `${ip}:${limitType}`;
      const limit = RATE_LIMITS[limitType];
      const now = Date.now();

      // Get current rate limit data
      const current = rateLimitStore.get(key);
      
      if (!current || now > current.resetTime) {
        // Reset or initialize rate limit
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + limit.window,
        });
      } else if (current.count >= limit.requests) {
        // Rate limit exceeded
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      } else {
        // Increment count
        current.count++;
        rateLimitStore.set(key, current);
      }

      return handler(request, ...args);
    };
  };
}

// Get client IP address
function resolveClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

// Input validation utilities
export const validators = {
  // Email validation
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Password validation
  password: (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return { valid: errors.length === 0, errors };
  },

  // Amount validation
  amount: (amount: number): boolean => {
    return typeof amount === 'number' && amount >= 0 && amount <= 999999999.99;
  },

  // Date validation
  date: (date: string | Date): boolean => {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime()) && dateObj <= new Date();
  },

  // Sanitize string input
  sanitizeString: (input: string): string => {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  },

  // Validate UUID/CUID
  cuid: (id: string): boolean => {
    const cuidRegex = /^c[a-z0-9]{24}$/;
    return cuidRegex.test(id);
  },
};

// Security headers middleware
export function securityHeaders(response: NextResponse): NextResponse {
  // Prevent XSS attacks
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https:;"
  );
  
  // HSTS (HTTP Strict Transport Security)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  response.headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  
  return response;
}

// Input sanitization middleware
export function sanitizeInput(handler: SecurityHandler): SecurityHandler {
  return async function (request: NextRequest, ...args: any[]): Promise<NextResponse | Response> {
    // Sanitize request body if it exists
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const body = await request.clone().json();
        const sanitizedBody = sanitizeObject(body);
        
        // Create new request with sanitized body
        const sanitizedRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(sanitizedBody),
        });
        
        return handler(sanitizedRequest, ...args);
      } catch {
        // If JSON parsing fails, continue with original request
        return handler(request, ...args);
      }
    }
    
    return handler(request, ...args);
  };
}

// Recursively sanitize object properties
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return validators.sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[validators.sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

// Authentication middleware
export function requireAuth(handler: SecurityHandler): SecurityHandler {
  return async function (request: NextRequest, ...args: any[]): Promise<NextResponse | Response> {
    const authToken = request.cookies.get('auth-token');
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    try {
      const { AuthService } = await import('./auth');
      const payload = AuthService.verifyAccessToken(authToken.value);
      
      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }
      
      // Add user info to request headers for downstream handlers
      request.headers.set('x-user-id', payload.userId);
      request.headers.set('x-user-email', payload.email);
      
      return handler(request, ...args);
    } catch (error) {
      console.error('Authentication middleware failed:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

// CORS configuration
export function corsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes
