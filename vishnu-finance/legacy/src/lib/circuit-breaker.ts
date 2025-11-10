// Circuit Breaker pattern implementation for resilient error handling
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  recoveryTimeout: number;     // Time to wait before trying again (ms)
  monitoringPeriod: number;    // Time window for failure counting (ms)
  expectedResponseTime: number; // Max expected response time (ms)
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalRequests: number;
  averageResponseTime: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private totalRequests = 0;
  private responseTimes: number[] = [];
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    const startTime = performance.now();
    this.totalRequests++;

    try {
      const result = await Promise.race([
        operation(),
        this.timeoutPromise()
      ]);

      const responseTime = performance.now() - startTime;
      this.recordSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.recordFailure(responseTime);
      throw error;
    }
  }

  private timeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Operation timeout'));
      }, this.config.expectedResponseTime);
    });
  }

  private recordSuccess(responseTime: number): void {
    this.successCount++;
    this.lastSuccessTime = new Date();
    this.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for average calculation
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
    }
  }

  private recordFailure(responseTime: number): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.responseTimes.push(responseTime);

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.recoveryTimeout;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      averageResponseTime: this.responseTimes.length > 0 
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
        : 0
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.totalRequests = 0;
    this.responseTimes = [];
  }
}

// Circuit breaker manager for different services
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();

  getBreaker(serviceName: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        recoveryTimeout: 30000, // 30 seconds
        monitoringPeriod: 60000, // 1 minute
        expectedResponseTime: 5000, // 5 seconds
        ...config
      };
      
      this.breakers.set(serviceName, new CircuitBreaker(defaultConfig));
    }
    
    return this.breakers.get(serviceName)!;
  }

  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [serviceName, breaker] of this.breakers.entries()) {
      stats[serviceName] = breaker.getStats();
    }
    
    return stats;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  reset(serviceName: string): void {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.reset();
    }
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();

// Predefined circuit breakers for common services
export const circuitBreakers = {
  database: circuitBreakerManager.getBreaker('database', {
    failureThreshold: 3,
    recoveryTimeout: 10000,
    expectedResponseTime: 2000
  }),
  
  externalAPI: circuitBreakerManager.getBreaker('externalAPI', {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    expectedResponseTime: 5000
  }),
  
  fileSystem: circuitBreakerManager.getBreaker('fileSystem', {
    failureThreshold: 3,
    recoveryTimeout: 5000,
    expectedResponseTime: 1000
  }),
  
  cache: circuitBreakerManager.getBreaker('cache', {
    failureThreshold: 10,
    recoveryTimeout: 5000,
    expectedResponseTime: 100
  })
};

// Retry mechanism with exponential backoff
export class RetryMechanism {
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;

  constructor(maxRetries = 3, baseDelay = 1000, maxDelay = 10000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  async execute<T>(
    operation: () => Promise<T>,
    shouldRetry?: (error: Error) => boolean
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries) {
          break;
        }

        if (shouldRetry && !shouldRetry(lastError)) {
          break;
        }

        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt),
          this.maxDelay
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global retry mechanism
export const retryMechanism = new RetryMechanism();

// Error classification for better handling
export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export class ErrorClassifier {
  static classify(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    
    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return ErrorType.AUTHENTICATION;
    }
    
    if (message.includes('forbidden') || message.includes('authorization')) {
      return ErrorType.AUTHORIZATION;
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return ErrorType.NOT_FOUND;
    }
    
    if (message.includes('rate limit') || message.includes('429')) {
      return ErrorType.RATE_LIMITED;
    }
    
    if (message.includes('database') || message.includes('prisma')) {
      return ErrorType.DATABASE_ERROR;
    }
    
    if (message.includes('500') || message.includes('server error')) {
      return ErrorType.SERVER_ERROR;
    }
    
    return ErrorType.UNKNOWN;
  }

  static shouldRetry(error: Error): boolean {
    const errorType = this.classify(error);
    
    return [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.RATE_LIMITED,
      ErrorType.SERVER_ERROR,
      ErrorType.DATABASE_ERROR
    ].includes(errorType);
  }
}

// Resilient operation wrapper
export async function resilientOperation<T>(
  operation: () => Promise<T>,
  serviceName: string,
  options?: {
    useCircuitBreaker?: boolean;
    useRetry?: boolean;
    maxRetries?: number;
  }
): Promise<T> {
  const {
    useCircuitBreaker = true,
    useRetry = true,
    maxRetries = 3
  } = options || {};

  let executeOperation = operation;

  // Apply circuit breaker
  if (useCircuitBreaker) {
    const breaker = circuitBreakerManager.getBreaker(serviceName);
    executeOperation = () => breaker.execute(operation);
  }

  // Apply retry mechanism
  if (useRetry) {
    const retry = new RetryMechanism(maxRetries);
    executeOperation = () => retry.execute(executeOperation, ErrorClassifier.shouldRetry);
  }

  return executeOperation();
}
