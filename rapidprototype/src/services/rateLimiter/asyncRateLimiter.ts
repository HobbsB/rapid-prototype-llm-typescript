import Bottleneck from 'bottleneck';

/**
 * Configuration interface for AsyncRateLimiter
 */
export interface AsyncRateLimiterConfig {
  /** Maximum number of concurrent requests */
  maxConcurrent: number;
  /** Maximum number of requests allowed in the interval */
  intervalCap: number;
  /** Time interval for rate limiting in milliseconds */
  interval: number;
  /** Minimum time between requests in milliseconds (optional) */
  minTime?: number;
}

/**
 * Interface for processing errors that occur during rate-limited operations
 */
export interface ProcessingError<T> {
  /** The item that failed processing */
  item: T;
  /** The error that occurred during processing */
  error: Error;
}

/**
 * Service to handle async rate limiting for API requests using Bottleneck
 */
export class AsyncRateLimiter {
  private limiter: Bottleneck;

  constructor(config: AsyncRateLimiterConfig) {
    // Validate configuration
    if (config.maxConcurrent <= 0) {
      throw new Error('maxConcurrent must be greater than 0');
    }
    if (config.intervalCap < config.maxConcurrent) {
      throw new Error('intervalCap must be greater than or equal to maxConcurrent');
    }
    if (config.interval <= 0) {
      throw new Error('interval must be greater than 0');
    }
    if (config.minTime !== undefined && config.minTime <= 0) {
      throw new Error('minTime, if specified, must be greater than 0');
    }

    this.limiter = new Bottleneck({
      maxConcurrent: config.maxConcurrent,
      
      // Token bucket (reservoir) settings
      reservoir: config.intervalCap,
      reservoirRefreshAmount: config.intervalCap,
      reservoirRefreshInterval: config.interval,
      
      // Minimum time between requests (if specified)
      minTime: config.minTime ?? Math.ceil(config.interval / config.intervalCap)
    });
  }

  /**
   * Wraps an async function with rate limiting
   * @param fn The async function to be rate limited
   * @returns A rate-limited version of the function
   */
  wrap<T extends (...args: any[]) => Promise<any>>(fn: T): (...args: Parameters<T>) => ReturnType<T> {
    return this.limiter.wrap(fn) as unknown as (...args: Parameters<T>) => ReturnType<T>;
  }

  /**
   * Schedules a job to be executed when rate limit allows
   * @param fn The async function to execute
   * @returns Promise that resolves with the function result
   */
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(fn);
  }

  /**
   * Process an array of items through the rate limiter
   * @param items Array of items to process
   * @param processor Function to process each item
   * @returns Object containing successful results and failed items with their errors
   */
  async processItems<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<{
    successful: R[];
    failed: ProcessingError<T>[];
  }> {
    type ResultAccumulator = {
      successful: R[];
      failed: ProcessingError<T>[];
    };

    const results = await Promise.allSettled(
      items.map(item => 
        this.schedule(() => processor(item))
      )
    );

    return results.reduce<ResultAccumulator>((acc, result, index) => {
      if (result.status === 'fulfilled') {
        acc.successful.push(result.value);
      } else {
        acc.failed.push({
          item: items[index],
          error: result.reason instanceof Error ? result.reason : new Error('Unknown error')
        });
      }
      return acc;
    }, { successful: [], failed: [] });
  }

  /**
   * Stops the rate limiter and clears all queued jobs
   */
  async stop(): Promise<void> {
    await this.limiter.stop();
  }
} 