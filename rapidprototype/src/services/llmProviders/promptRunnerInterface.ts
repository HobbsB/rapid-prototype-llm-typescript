import { ToolSet, GenerateTextResult, ToolChoice, StopCondition } from 'ai';
import { z } from 'zod';

/**
 * PROMPT RUNNER INTERFACE - Abstraction Layer for LLM Providers
 * ===========================================================
 *
 * THE CONTRACT FOR OUR LLM ABSTRACTION SYSTEM
 * ==========================================
 * This interface defines the clean, simple API that our BasePromptTaskService
 * and BaseAgentService use. It abstracts away all the complexity of different
 * LLM providers and the Vercel AI SDK, providing:
 * - Simple runTask() method for structured generation
 * - Simple runAgent() method for tool-enabled conversations
 * - Consistent error handling and configuration
 * - Provider-agnostic design for easy switching
 *
 * Without this abstraction, every service would need to know about:
 * - Different AI SDK methods (generateObject, generateText)
 * - Provider-specific configuration
 * - Tool calling syntax and patterns
 * - Error handling and retry logic
 *
 * This interface defines the contract for all LLM provider implementations:
 *
 * TWO EXECUTION MODES:
 * ===================
 * 1. runTask(): Single-shot structured generation
 *    - Takes schema + messages → Returns typed object
 *    - Used by BasePromptTaskService for focused tasks
 *    - Always requires Zod schema for validation
 *
 * 2. runAgent(): Multi-turn conversations with tools
 *    - Takes agent config with tools and prompts
 *    - Returns GenerateTextResult with tool call history
 *    - Used by BaseAgentService for interactive workflows
 *
 * DESIGN PRINCIPLES:
 * =================
 * - Provider Agnostic: Same interface works with OpenRouter, OpenAI, etc.
 * - Type Safety: Generic types ensure compile-time safety
 * - Error Handling: Structured error propagation
 * - Configurable: Timeout, retries, and provider-specific options
 *
 * IMPLEMENTATION PATTERN:
 * =====================
 * - Each provider (OpenRouter, OpenAI) implements this interface
 * - Services use IPromptRunner without knowing the underlying provider
 * - Easy to switch providers or add new ones
 */
/**
 * Configuration options for task execution
 */
export interface TaskExecutionConfig {
  maxTokens?: number;
  timeoutMs?: number;
  retryParsingErrors?: boolean;
}

export interface IPromptRunner {
  /**
   * Run a prompt with the given inputs and return the result
   * @param promptTemplate The prompt template to use
   * @param userInputs Optional inputs to fill in the prompt template
   * @param systemTemplate Optional system message template
   * @param systemInputs Optional inputs to fill in the system template
   * @param schema Required Zod schema for structured output
   * @param includeRaw Optional flag to include raw response in structured output
   */
  runTask<T = string>(
    schema: z.ZodType,
    messages: Array<PromptRunnerTaskMessage>,
    config?: TaskExecutionConfig
  ): Promise<T>;

  /**
   * Run an agent with tools and multi-step conversation
   * @param input Agent execution configuration
   */
  runAgent<TOOLS extends ToolSet = ToolSet>(
    input: AgentExecutionInput<TOOLS>
  ): Promise<GenerateTextResult<TOOLS, never>>;
} 

// prompt runner messages is either a system message or a user message omitting the providerOptions
export interface PromptRunnerTaskMessage {
  role: 'system' | 'user';
  content: string;
}


/**
 * Interface for model configuration in OpenRouter
 */
export interface ProviderModelConfig {
    modelName: string;
    reasoningEnabled?: boolean;
    reasoningEffort?: "low" | "medium" | "high";
    notes?: string;
}


/**
 * Input for agent execution
 */
export interface AgentExecutionInput<TOOLS extends ToolSet = ToolSet> {
  initialPrompt: string;
  systemPrompt: string;
  tools: TOOLS;
  toolChoice?: ToolChoice<TOOLS>;
  stopWhen?: StopCondition<TOOLS> | Array<StopCondition<TOOLS>>;
  debug?: boolean;
}


  