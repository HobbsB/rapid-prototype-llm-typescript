/**
 * Configuration interface for RateLimiter
 */
export interface syncRateLimiterConfig {
  /** Minimum time between requests in milliseconds */
  minRequestInterval: number;
  /** Time window for rate limiting in milliseconds */
  rateLimitWindow: number;
  /** Maximum number of requests allowed in the window */
  maxRequestsPerWindow: number;
  /** Buffer time to add when rate limit is hit */
  rateLimitResetBuffer: number;
}

/**
 * Service to handle rate limiting for API requests
 */
export class SyncRateLimiter {
  private requestTimes: number[] = [];
  private lastRequestTime: number = 0;

  constructor(private readonly config: syncRateLimiterConfig) {}

  async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove requests older than the window
    this.requestTimes = this.requestTimes.filter(
      time => now - time < this.config.rateLimitWindow
    );
    
    // Check if we're approaching rate limit
    if (this.requestTimes.length >= this.config.maxRequestsPerWindow) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.config.rateLimitWindow - (now - oldestRequest) + this.config.rateLimitResetBuffer;
      const waitMinutes = Math.ceil(waitTime/1000/60);
      
      // Wait for the rate limit window to pass
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestTimes = [];
    }

    // Ensure minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.config.minRequestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.config.minRequestInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
    this.requestTimes.push(this.lastRequestTime);
  }
} 