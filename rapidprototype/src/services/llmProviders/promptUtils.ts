import { NoObjectGeneratedError } from 'ai';

/**
 * Utility class for prompt runner operations
 */
export class PromptUtils {
  /**
   * Determines if an error is related to output parsing
   */
  static isParsingError(error: unknown): boolean {
    
    // Check for TimeoutError in error name
    const errorName = error instanceof Error ? error.name : 'Unknown error';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for ZodError using the exact same pattern Zod uses internally
    const isZodError = error instanceof Error &&
                      error.name === "ZodError";

    // Check for Vercel AI specific errors that should trigger retry
    const isNoObjectGeneratedError = NoObjectGeneratedError.isInstance(error);

    const isTimeoutError = errorName.includes('TimeoutError');

    // Debug log to help diagnose error handling
    console.log('Error detection:', {
      errorType: error?.constructor?.name,
      errorName: (error as Error)?.name,
      errorMessage,
      isZodError,
      isNoObjectGeneratedError,
      isTimeoutError
    });

    return isZodError || isNoObjectGeneratedError || isTimeoutError;
  }

  /**
   * Retry an operation with exponential backoff
   * @param operation Function to retry
   * @param retryOnlyParsingErrors If true, only retry on parsing errors
   * @param maxRetries Maximum number of retry attempts
   * @param delayMs Delay between retries in milliseconds
   */
  static async retryParsingOperation<T>(
    operation: () => Promise<T>, 
    retryOnlyParsingErrors = true,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const shouldRetry = !retryOnlyParsingErrors || this.isParsingError(error);
        
        if (!shouldRetry || attempt === maxRetries) {
          console.error('Error running operation:', error);
          throw error;
        }

        console.error(`Retry: Operation failed on attempt ${attempt} of ${maxRetries}, retrying in ${delayMs}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('Retry operation failed'); // TypeScript requires this
  }

} 