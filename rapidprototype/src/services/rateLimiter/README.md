# AsyncRateLimiter Documentation

The `AsyncRateLimiter` provides rate-limited concurrent processing of asynchronous operations using Bottleneck. It's designed for handling API requests, data processing, and other operations that need controlled concurrency and rate limiting.

## Basic Usage

```typescript
import { AsyncRateLimiter, AsyncRateLimiterConfig } from './asyncRateLimiter';

// Configure the rate limiter
const config: AsyncRateLimiterConfig = {
  maxConcurrent: 5,      // Process 5 items concurrently
  intervalCap: 20,       // Maximum 20 requests per window
  interval: 10000,       // 10 second window
  minTime: 200          // Minimum 200ms between requests
};

// Initialize the rate limiter
const rateLimiter = new AsyncRateLimiter(config);

// Process items with type safety
interface MyItem {
  id: number;
  data: string;
}

interface ProcessedResult {
  itemId: number;
  result: string;
}

const items: MyItem[] = [/* your items */];

const { successful, failed } = await rateLimiter.processItems<MyItem, ProcessedResult>(
  items,
  async (item) => {
    const result = await processItem(item);
    return {
      itemId: item.id,
      result: result
    };
  }
);
```

## Type Safety

The `processItems` method is fully type-safe and requires explicit type parameters:

```typescript
processItems<T, R>(
  items: T[],                    // Input items of type T
  processor: (item: T) => Promise<R>  // Processor function returning type R
): Promise<{
  successful: R[];              // Array of successful results
  failed: ProcessingError<T>[];  // Array of failed items with errors
}>
```

### Processing Error Interface

```typescript
interface ProcessingError<T> {
  item: T;           // The original item that failed
  error: Error;      // The error that occurred
}
```

## Error Handling

The rate limiter provides comprehensive error handling through the `ProcessingError` interface:

```typescript
// Track processing errors with proper typing
let processingErrors: ProcessingError<ArticleWithContent>[] = [];

const { successful, failed } = await rateLimiter.processItems<ArticleWithContent, number>(
  articles,
  async (article) => {
    try {
      return await processArticle(article);
    } catch (error) {
      // Errors are automatically captured and typed
      throw error instanceof Error ? error : new Error('Unknown error');
    }
  }
);

// Access typed errors
failed.forEach(failure => {
  console.error(`Failed to process article ${failure.item.id}: ${failure.error.message}`);
});
```

## Empty Input Handling

The rate limiter safely handles empty input arrays:

```typescript
const items: MyItem[] = [];
const result = await rateLimiter.processItems<MyItem, ProcessedResult>(items, processor);

// Result will be:
// { successful: [], failed: [] }
```

## Partial Success Handling

The rate limiter allows processing to continue even when some items fail:

```typescript
interface Article {
  id: number;
  content: string;
}

const articles: Article[] = [/* articles */];

const { successful, failed } = await rateLimiter.processItems<Article, number>(
  articles,
  async (article) => {
    if (!article.content) {
      throw new Error(`Article ${article.id} has no content`);
    }
    return await processArticle(article);
  }
);

// Handle partial success
if (successful.length > 0) {
  await saveSuccessfulResults(successful);
}

if (failed.length > 0) {
  await logFailedItems(failed);
  
  // Access the original items and errors
  failed.forEach(failure => {
    console.error(
      `Failed to process article ${failure.item.id}: ${failure.error.message}`
    );
  });
}

// Check if we had any success
if (failed.length > 0 && successful.length === 0) {
  throw new Error('All items failed processing');
}
```

## Best Practices

1. **Always Specify Types**: Use explicit type parameters when calling `processItems`:
   ```typescript
   rateLimiter.processItems<InputType, OutputType>(...)
   ```

2. **Error Handling**: Always handle both successful and failed results:
   ```typescript
   const { successful, failed } = await rateLimiter.processItems<T, R>(...)
   ```

## Example Implementation

Here's a complete example from the codebase:

```typescript
class InsightExtractionOrchestrator {
  private readonly rateLimiter: AsyncRateLimiter;

  constructor() {
    const config: AsyncRateLimiterConfig = {
      maxConcurrent: 5,
      intervalCap: 40,
      interval: 10500,
      minTime: 205
    };
    this.rateLimiter = new AsyncRateLimiter(config);
  }

  async processArticles(articles: ArticleWithContent[]): Promise<void> {
    let extractionErrors: ProcessingError<ArticleWithContent>[] = [];

    const { successful: completedArticleIds, failed: processingErrors } = 
      await this.rateLimiter.processItems<ArticleWithContent, number>(
        articles,
        article => this.extractAndStoreArticle(article)
      );

    // Handle results
    if (processingErrors.length > 0) {
      extractionErrors = processingErrors;
      
      // Convert errors to the format expected by your error tracking
      const errorsToReport = extractionErrors.map(err => ({
        articleId: err.item.id,
        errorMsg: err.error.message
      }));
      
      await this.reportErrors(errorsToReport);
    }

    // Handle successful processing
    if (completedArticleIds.length > 0) {
      await this.markArticlesComplete(completedArticleIds);
    }
  }
}
``` 