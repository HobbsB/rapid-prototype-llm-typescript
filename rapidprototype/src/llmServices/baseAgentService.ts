import { IPromptRunner } from '../services/llmProviders/promptRunnerInterface';
import { OpenRouterPromptRunner, ModelType } from '../services/llmProviders/openRouterPromptRunner';
import { AgentExecutionInput } from '../services/llmProviders/promptRunnerInterface';
import { ToolSet, GenerateTextResult, stepCountIs, ToolChoice, GenerateTextOnStepFinishCallback } from 'ai';

/**
 * Simplified agent configuration for BaseAgentService
 * This gets converted to proper SDK types in the execute method
 */
export interface SimpleAgentConfig {
  toolChoice?: 'auto' | 'required' | 'none';
  maxSteps?: number;
  debug?: boolean;
}

/**
 * Configuration options for agent services
 * Extends SimpleAgentConfig to include runner-specific settings
 */
export interface BaseAgentServiceConfig {
  runner?: IPromptRunner;
}

/**
 * Base class for all agent-based services.
 *
 * ABSTRACTION OVER COMPLEX AI SDK AGENT IMPLEMENTATION
 * ===========================================================
 * This base class dramatically simplifies building interactive LLM agents with tools.
 * Instead of manually managing the Vercel AI SDK's generateText() with tool calling,
 * conversation state, and complex configuration, you get:
 * - Simple execute() method that handles the entire agent lifecycle
 * - Guided abstract methods for system prompts, initial prompts, and tools
 * - Consistent agent patterns across your application
 * - Debug support and error handling
 *
 * ARCHITECTURAL PATTERN: Multi-Step LLM Agents with Tools
 * =======================================================
 * This pattern is for complex, interactive LLM workflows that:
 * - Engage in multi-turn conversations with the user
 * - Use tools to perform actions and gather information
 * - Follow structured workflows with conditional logic
 * - Are ideal for: interactive assistants, complex problem-solving, guided processes
 *
 * KEY DIFFERENCES FROM PROMPT TASKS:
 * - Agents maintain conversation state across multiple LLM calls
 * - Agents can use tools to interact with external systems
 * - Agents follow dynamic workflows vs fixed input→output pattern
 * - Agents require careful prompt engineering for tool usage
 *
 * AGENT WORKFLOW:
 * 1. System prompt defines role and tool usage rules
 * 2. Initial prompt starts the conversation
 * 3. Agent calls tools based on workflow requirements
 * 4. Agent processes tool results and continues conversation
 * 5. Agent terminates when reaching completion criteria
 */
export abstract class BaseAgentService<TInput = any, TOutput = any> {
  protected readonly runner: IPromptRunner;

  constructor(config?: BaseAgentServiceConfig) {
    // Create a runner with default agent configuration if not provided
    this.runner = config?.runner || new OpenRouterPromptRunner(ModelType.GEMINI_FLASH, 0.7 );
  }

  
  /**
   * Optional override to customize agent configuration
   * Default provides reasonable agent settings
   */
  protected getAgentConfig(): Partial<SimpleAgentConfig> {
    return {
      toolChoice: 'auto',
      maxSteps: 10,
      debug: false
    };
  }

  /**
   * Override to provide the system prompt for the agent
   * @param input The input data for this agent execution
   */
  protected abstract getSystemPrompt(input: TInput): string;

  /**
   * Override to provide the initial prompt for the agent conversation
   * @param input The input data for this agent execution
   */
  protected abstract getInitialPrompt(input: TInput): string;


  /**
   * Override to define the tools available to this agent
   * All tools for this agent should be defined here
   */
  protected abstract getTools(): ToolSet;

  /**
   * Override to process the raw agent execution result into the desired output type
   * This is where domain-specific result processing happens (extracting tool data, etc.)
   * @param result The raw result from agent execution
   */
  protected abstract processAgentResult(result: GenerateTextResult<ToolSet, never>): TOutput;


  /**
   * Execute the agent with the given input
   * Orchestrates the agent workflow: setup -> execution -> result processing
   */
  public async execute(input: TInput): Promise<TOutput> {
    // Get the tools first (needed for proper typing)
    const tools = this.getTools();

    // Get simple configuration
    const simpleConfig = this.getAgentConfig();

    // Prepare execution input
    const executionInput: AgentExecutionInput<typeof tools> = {
      initialPrompt: this.getInitialPrompt(input),
      systemPrompt: this.getSystemPrompt(input),
      tools,
      toolChoice: simpleConfig.toolChoice as ToolChoice<typeof tools>,
      stopWhen: simpleConfig.maxSteps ? stepCountIs(simpleConfig.maxSteps) : undefined,
      debug: simpleConfig.debug || false
    };

    // Execute the agent
    const result = await this.runner.runAgent(executionInput);

    // Process the result into the desired output type
    return this.processAgentResult(result);
  }
}
