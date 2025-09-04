import { ModelType, OpenRouterPromptRunner } from '../services/llmProviders/openRouterPromptRunner';
import { z } from 'zod';
import { IPromptRunner, PromptRunnerTaskMessage, TaskExecutionConfig  } from '../services/llmProviders/promptRunnerInterface';

/**
 * Configuration options for task services
 */
export interface BasePromptServiceConfig {
  runner?: IPromptRunner;
}

/**
 * Base class for all prompt-based services.
 *
 * DEVELOPER-FRIENDLY ABSTRACTION OVER VERCEL AI SDK
 * =================================================
 * This base class provides a simplified, guided interface for building LLM prompt tasks.
 * Instead of directly using the Vercel AI SDK's generateObject() function with all its
 * complexity, you get:
 * - Simple execute() method instead of verbose SDK calls
 * - Guided abstract methods (getSchema, buildMessages) for consistency
 * - Built-in error handling and retry logic
 * - Type-safe inputs and outputs
 * - Consistent patterns across all prompt tasks
 *
 * ARCHITECTURAL PATTERN: Single-Shot LLM Tasks
 * ============================================
 * This pattern is for focused, single-purpose LLM interactions that:
 * - Take structured input → Process with LLM → Return structured output
 * - Use Zod schemas for type-safe, validated responses
 * - Follow a simple request-response cycle (no conversation)
 * - Are ideal for: data extraction, content generation, analysis tasks
 *
 * Contrast with BaseAgentService: Use this for single operations,
 * use agents for multi-step workflows with tool usage.
 *
 * EXAMPLE WORKFLOW:
 * 1. Input validation (validateInput)
 * 2. Message construction (buildMessages)
 * 3. LLM execution with schema validation
 * 4. Typed output return
 */
export abstract class BasePromptTaskService<TInput = any, TOutput = string> {
  protected readonly runner: IPromptRunner;

  constructor(config?: BasePromptServiceConfig) {
    // Create a PromptRunner with default configuration if not provided
    this.runner = config?.runner || new OpenRouterPromptRunner(ModelType.GEMINI_FLASH, 0.7);
  }

  /**
   * Override to provide a Zod schema for structured output.
   * Return undefined for string output.
   */
  protected abstract getSchema(): z.ZodType

  /**
 * Optional validation method that services can override.
 * Called before message building and LLM execution.
 * Throw errors for invalid inputs.
 */
  protected validateInput(input: TInput): void {
    // Default: no validation - services can override
  }
  
  /**
   * Override to build the message array for the LLM prompt.
   * Implement this method to construct the conversation messages from your input.
   */
  protected abstract buildMessages(input: TInput): Array<PromptRunnerTaskMessage>;

  /**
   * Optional method to provide task-specific execution configuration.
   * Override to customize timeout and max tokens for this specific task.
   * @param input The input data for this task execution
   */
  protected getTaskConfig(input: TInput): TaskExecutionConfig | undefined {
    // Default: no special configuration - services can override for custom timeouts/tokens
    return undefined;
  }


  /**
   * Executes the prompt with the given inputs.
   * Builds messages using the abstract buildMessages method.
   */
  public async execute(input: TInput): Promise<TOutput> {
    this.validateInput(input);
    const messages = this.buildMessages(input);
    const config = this.getTaskConfig(input);
    return this.runner.runTask<TOutput>(
      this.getSchema(),
      messages,
      config
    );
  }
} 