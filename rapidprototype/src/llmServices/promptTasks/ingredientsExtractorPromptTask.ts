import { z } from 'zod';
import { BasePromptTaskService, BasePromptServiceConfig } from '../basePromptTaskService';
import { OpenRouterPromptRunner, ModelType } from '../../services/llmProviders/openRouterPromptRunner';
import { PromptRunnerTaskMessage } from '../../services/llmProviders/promptRunnerInterface';

// Define the schema for the ingredients extractor output
export const IngredientsExtractorSchema = z.object({
  breadType: z.string().describe('The type of bread being prepared'),
  ingredients: z.array(z.string()).describe('Complete list of ingredients with precise quantities'),
  estimatedCost: z.string().describe('Estimated cost range for all ingredients'),
  prepTime: z.string().describe('Hands-on preparation time required'),
  bakeTime: z.string().describe('Baking time and temperature')
});

export type IngredientsExtractorOutput = z.infer<typeof IngredientsExtractorSchema>;

export interface IngredientsExtractorInput {
  breadType: string;
  dietaryPreferences?: string[];
}

/**
 * Service for extracting and generating complete ingredient lists for specific bread types using LLM
 */
export class IngredientsExtractorPromptTask extends BasePromptTaskService<IngredientsExtractorInput, IngredientsExtractorOutput> {
  constructor(config?: BasePromptServiceConfig) {
    const runner = config?.runner || new OpenRouterPromptRunner(ModelType.GEMINI_FLASH, 0.7);
    super({ runner });
  }

  /**
   * Override to provide structured output schema
   */
  protected getSchema(): z.ZodType {
    return IngredientsExtractorSchema;
  }

  /**
   * Override to validate input before processing
   */
  protected validateInput(input: IngredientsExtractorInput): void {
    if (!input.breadType || input.breadType.trim() === '') {
      throw new Error('Bread type must be provided');
    }
  }

  /**
   * Override to build the message array for the LLM prompt
   */
  protected buildMessages(input: IngredientsExtractorInput): Array<PromptRunnerTaskMessage> {
    return [
      { role: 'system', content: this.getSystemMessage(input) },
      { role: 'user', content: this.getUserMessage(input) }
    ];
  }

  /**
   * Set system message for the LLM
   */
  private getSystemMessage(input: IngredientsExtractorInput): string {
    return `You are an expert baker and culinary professional with extensive knowledge of bread making. Your task is to provide complete, accurate ingredient lists for specific types of bread.

Guidelines for ingredient selection:
- Provide precise quantities for all ingredients using standard baking measurements
- Include all essential bread-making staples (flour, yeast, salt, water/liquid)
- Consider proper hydration ratios for the specific bread type
- Provide realistic cost estimates based on current market prices
- Include accurate preparation and baking times for the bread type
- Ensure ingredient combinations result in successful, delicious bread

Provide comprehensive, professional-grade ingredient lists that will yield excellent results.`;
  }

  /**
   * Define the main prompt template
   */
  private getUserMessage(input: IngredientsExtractorInput): string {
    return `Please provide a complete ingredient list for making ${input.breadType}.

Provide:
1. Complete list of ingredients with precise quantities
2. Estimated cost range for all ingredients
3. Hands-on preparation time required
4. Baking time and temperature

Ensure the recipe will produce excellent results and consider proper bread-making techniques for ${input.breadType}.`;
  }
}
