/**
 * Rate limiter for MQTT operations to prevent spam
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(private config: RateLimitConfig) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.config.windowMs);
    
    // Check if we're under the limit
    if (validRequests.length >= this.config.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  getRemainingTime(key: string): number {
    const requests = this.requests.get(key) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    return Math.max(0, this.config.windowMs - (Date.now() - oldestRequest));
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

// Create rate limiters for different operations
export const mqttPublishLimiter = new RateLimiter({
  maxRequests: 10, // 10 publishes per window
  windowMs: 1000   // 1 second window
});

export const mqttSubscribeLimiter = new RateLimiter({
  maxRequests: 5,   // 5 subscribes per window
  windowMs: 1000   // 1 second window
});

export const deviceOperationLimiter = new RateLimiter({
  maxRequests: 3,   // 3 device operations per window
  windowMs: 2000   // 2 second window
});

/**
 * Decorator function to apply rate limiting to async functions
 */
export function withRateLimit<T extends any[], R>(
  limiter: RateLimiter,
  key: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    if (!limiter.isAllowed(key)) {
      const remainingTime = limiter.getRemainingTime(key);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(remainingTime / 1000)} seconds.`);
    }
    
    return fn(...args);
  };
}
