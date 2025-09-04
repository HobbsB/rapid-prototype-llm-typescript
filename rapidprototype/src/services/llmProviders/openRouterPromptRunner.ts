import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { config } from '../../config';
import { PromptUtils } from './promptUtils';
import { IPromptRunner, PromptRunnerTaskMessage, ProviderModelConfig, AgentExecutionInput, TaskExecutionConfig } from './promptRunnerInterface';
import { ToolSet, GenerateTextResult } from 'ai';
import { OpenRouterProviderOptions } from '@openrouter/ai-sdk-provider';
import { ModelType, MODEL_CONFIGS, DEFAULT_MODEL_TYPE } from './models';

//reexport the model type enum
export { ModelType, MODEL_CONFIGS, DEFAULT_MODEL_TYPE };



/**
 * OpenRouterPromptRunner: LLM Provider Implementation
 * ===================================================
 *
 * THE "TRANSLATION LAYER" OF OUR ABSTRACTION
 * =========================================
 * This class bridges our developer-friendly abstractions with the raw Vercel AI SDK.
 * When you call service.execute() on a prompt task or agent, it calls
 * methods in this class, which translate our simple interfaces into the more complex (but still not bad)
 * AI SDK calls that handle:
 * - generateObject() for structured outputs
 * - generateText() with tools for agents
 * - Model configuration and provider setup
 * - Error handling and retries
 * - Response parsing and validation
 *
 * This abstraction means cursor can work with simple, guided interfaces while
 * the complexity of AI SDK integration is handled here.
 *
 * This class demonstrates key patterns for LLM provider integration:
 *
 * 1. MODEL CONFIGURATION STRATEGY:
 *    - Centralized model definitions with cost/performance metadata
 *    - Easy switching between models for different use cases
 *    - Default to cost-effective models (GEMINI_CHEAP) for development
 *
 * 2. STRUCTURED OUTPUT PATTERN:
 *    - Uses generateObject() for type-safe LLM responses
 *    - Always requires Zod schema for validation
 *    - Automatic retry logic for parsing failures
 *
 * 3. AGENT VS TASK PATTERNS:
 *    - runTask(): Single-shot structured generation
 *    - runAgent(): Multi-turn conversations with tool calling
 *
 * 4. ERROR HANDLING:
 *    - Retry logic for transient failures
 *    - Timeout protection for long-running requests
 *    - Structured error reporting
 */
export class OpenRouterPromptRunner implements IPromptRunner {
  private readonly provider: ReturnType<typeof createOpenRouter>;
  private readonly modelConfig: ProviderModelConfig;
  private readonly temperature: number;

   /**
     * @param modelType The model type to use (defaults to GEMINI_CHEAP)
     * @param temperature Temperature setting for generation (defaults to 0.7)
     */

  constructor( modelType?: ModelType, temperature?: number) {
    if (!config.openRouterApiKey) {
      throw new Error('OpenRouter API key is not configured');
    }

    const selectedModelType = modelType ?? DEFAULT_MODEL_TYPE;
    const modelConfig = MODEL_CONFIGS[selectedModelType];

    if (!modelConfig) {
      throw new Error(`Invalid model type: ${selectedModelType}`);
    }

    this.modelConfig = modelConfig;

    // Store temperature for use in generateObject calls
    this.temperature = temperature ?? 0.7;

    // Create the provider instance
    this.provider = createOpenRouter({
      apiKey: config.openRouterApiKey
    });
  }


  /**
   * Generic method to run prompts with structured outputs using Vercel AI SDK
   */
  public async runTask<T = string>(
    schema: z.ZodType,
    messages: Array<PromptRunnerTaskMessage>,
    config?: TaskExecutionConfig
  ): Promise<T> {  

    const retryParsingErrors = config?.retryParsingErrors != undefined ? config?.retryParsingErrors : true;
    
    // Use retry logic for parsing errors
    return PromptUtils.retryParsingOperation(async () => {
      // Create provider options for OpenRouter
      const providerOptions: OpenRouterProviderOptions = {};

      // Set reasoning if explicitly configured (true or false)
      if (this.modelConfig.reasoningEnabled !== undefined) {
        providerOptions.reasoning = {
          enabled: this.modelConfig.reasoningEnabled,
          exclude: true,
          effort: this.modelConfig.reasoningEffort || 'low'
        };
      }

      // Get task-specific config with defaults
      const taskMaxTokens = config?.maxTokens;
      const taskTimeoutMs = config?.timeoutMs ?? 30000; // Default 30 seconds
      

      // Generate structured object with timeout
      const result = await generateObject({
        model: fixToolCalls(this.provider(this.modelConfig.modelName)),
        messages: messages,
        schema,
        temperature: this.temperature,
        maxOutputTokens: taskMaxTokens,
        mode: 'auto',
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(taskTimeoutMs),
        providerOptions: { openrouter: providerOptions }
      });

      return result.object as T;
    }, retryParsingErrors);
  }

  /**
   * Run an agent with tools and multi-step conversation
   */
  public async runAgent<TOOLS extends ToolSet = ToolSet>(
    input: AgentExecutionInput<TOOLS>
  ): Promise<GenerateTextResult<TOOLS, never>> {
    // Create provider options for OpenRouter
    const providerOptions: OpenRouterProviderOptions = {};

    // Set reasoning if explicitly configured (true or false)
    if (this.modelConfig.reasoningEnabled !== undefined) {
      providerOptions.reasoning = {
        enabled: this.modelConfig.reasoningEnabled,
        exclude: true,
        effort: this.modelConfig.reasoningEffort || 'low'
      };
    }

    const onStepFinishHandler = input.debug ? debugInfoStepFinishHandler : undefined;

    // Generate text with tools
    const result = await generateText({
      model: this.provider(this.modelConfig.modelName),
      prompt: input.initialPrompt,
      system: input.systemPrompt,
      tools: input.tools,
      toolChoice: input.toolChoice || 'auto',
      stopWhen: input.stopWhen,
      temperature: this.temperature,
      onStepFinish: onStepFinishHandler,
      providerOptions: { openrouter: providerOptions }
    });

    // Return the native Vercel AI SDK result
    return result;
  } 
} 

function debugInfoStepFinishHandler (step: any): void {
  console.log(`\n🔄 Step completed - Finish Reason: ${step.finishReason}`);
  if (step.toolCalls && step.toolCalls.length > 0) {
    const toolNames = step.toolCalls.map((call: any) => call.toolName).join(', ');
    console.log(`🔧 Tools called: ${toolNames}`);
  }
  if (step.usage) {
    console.log(`📊 Usage: ${JSON.stringify(step.usage)}`);
  }
  if (step.text) {
    console.log(`💭 Agent: ${step.text.substring(0, 100)}${step.text.length > 100 ? '...' : ''}`);
  }
}

/**
 * Simple wrapper function to handle tool call edge cases, specifically for Open AI OSS models, but maybe more. Fixes a bug in the library when using generateObject for single, structured prompts.
 */
function fixToolCalls(model: any) {
  return {
    ...model,
    async doGenerate(options: any) {
      const result = await model.doGenerate(options);
      const hasText = result.content.some((c: any) => c.type === 'text');
      const hasToolCalls = result.content.some((c: any) => c.type === 'tool-call');

      if (!hasText && hasToolCalls && result.finishReason === 'tool-calls') {
        const toolCall = result.content.find((c: any) => c.type === 'tool-call');
        if (toolCall?.input) {
          result.content.push({
            type: 'text',
            text: typeof toolCall.input === 'string'
              ? toolCall.input
              : JSON.stringify(toolCall.input)
          });
        }
      }

      return result;
    }
  };
}
