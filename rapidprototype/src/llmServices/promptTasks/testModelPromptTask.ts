import { z } from 'zod';
import { BasePromptTaskService, BasePromptServiceConfig } from '../basePromptTaskService';
import { OpenRouterPromptRunner, ModelType } from '../../services/llmProviders/openRouterPromptRunner';
import { PromptRunnerTaskMessage, TaskExecutionConfig } from '../../services/llmProviders/promptRunnerInterface';

// Define the schema for the output
export const CognitiveEffortSchema = z.object({
  classifications: z.array(z.object({
    activity: z.string().describe('The activity being classified'),
    category: z.enum(['High', 'Low', 'Mixed']).describe('Cognitive effort category'),
    reasoning: z.string().describe('Explanation for the classification')
  })).describe('Array of activity classifications')
});

export type CognitiveEffortOutput = z.infer<typeof CognitiveEffortSchema>;

/**
 * Service for classifying activities by cognitive effort level using the LLM
 */
export class TestModelPromptTask extends BasePromptTaskService<void, CognitiveEffortOutput> {
  constructor(config?: BasePromptServiceConfig) {
    const runner = config?.runner || new OpenRouterPromptRunner(ModelType.GEMINI_FLASH, 0.7);
    super({ runner });
  }

  protected getTaskConfig(input: void): TaskExecutionConfig | undefined {
    return {
      retryParsingErrors: false
    };
  }

  /**
   * Override to provide structured output schema
   */
  protected getSchema(): z.ZodType {
    return CognitiveEffortSchema;
  }

  /**
   * Override to build the message array for the LLM prompt
   */
  protected buildMessages(input: void): Array<PromptRunnerTaskMessage> {
    return [
      { role: 'system', content: this.getSystemMessage() },
      { role: 'user', content: this.getUserMessage() }
    ];
  }

  /**
   * Set system message for the LLM
   */
  private getSystemMessage(): string {
    return `You are a cognitive psychologist specializing in analyzing mental effort required for various activities. You classify activities into three categories: High Cognitive Effort (requires significant concentration, problem-solving, or complex decision-making), Low Cognitive Effort (mostly automatic or passive activities), or Mixed (combines elements of both high and low effort).`;
  }

  /**
   * Define the main prompt template
   */
  private getUserMessage(): string {
    return `Classify these activities as High Cognitive Effort, Low Cognitive Effort, or Mixed, and explain why.
Activities: solving a Sudoku puzzle, watching TV, cooking dinner, writing an essay, playing chess.

For each activity, provide:
- The activity name
- Category (High, Low, or Mixed)
- Clear reasoning explaining your classification

Consider factors like:
- Concentration required
- Problem-solving involved
- Decision-making complexity
- Mental workload
- Automatic vs deliberate processes`;
  }


}
