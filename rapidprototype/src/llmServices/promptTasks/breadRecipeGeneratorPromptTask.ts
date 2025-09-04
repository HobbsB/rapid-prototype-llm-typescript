import { z } from 'zod';
import { BasePromptTaskService, BasePromptServiceConfig } from '../basePromptTaskService';
import { OpenRouterPromptRunner, ModelType } from '../../services/llmProviders/openRouterPromptRunner';
import { PromptRunnerTaskMessage } from '../../services/llmProviders/promptRunnerInterface';

// Define the schema for the bread recipe output
export const BreadRecipeSchema = z.object({
  title: z.string().describe('Creative and appealing title for the bread recipe'),
  description: z.string().describe('Brief description of the bread and its appeal'),
  servings: z.number().describe('Number of loaves or rolls this recipe yields'),
  prepTime: z.string().describe('Hands-on preparation time (e.g., "20 minutes")'),
  cookTime: z.string().describe('Baking time with temperature (e.g., "45 minutes at 375°F")'),
  totalTime: z.string().describe('Total time from start to finish'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe('Difficulty level of the bread recipe'),
  ingredients: z.array(z.string()).describe('List of ingredients with quantities'),
  instructions: z.array(z.string()).describe('Step-by-step bread-making instructions'),
  tips: z.array(z.string()).describe('Helpful bread-baking tips and variations')
});

export type BreadRecipeOutput = z.infer<typeof BreadRecipeSchema>;

export interface BreadRecipeInput {
  ingredients: string;
}

/**
 * Bread Recipe Generator - Prompt Engineering Example
 * ==================================================
 *
 * This service demonstrates key prompt engineering patterns for structured content generation:
 *
 * SCHEMA-DRIVEN GENERATION:
 * ========================
 * - Zod schema defines exact output structure and validation rules
 * - Field descriptions guide LLM toward desired content format
 * - Type-safe outputs eliminate parsing and validation code
 *
 * PROMPT ARCHITECTURE:
 * ===================
 * System Message: Defines role, expertise, and behavioral guidelines
 * - Establishes baker persona with specific knowledge areas
 * - Sets quality standards and technical requirements
 * - Provides context about proper bread-making techniques
 *
 * User Message: Provides specific task with concrete examples
 * - Clear, actionable instructions
 * - References input ingredients as creative inspiration
 * - Encourages innovation while maintaining quality standards
 *
 * VALIDATION PATTERNS:
 * ===================
 * Input validation ensures required data is present
 * Schema validation ensures output meets structural requirements
 * Business rule validation can be added for domain-specific constraints
 */
export class BreadRecipeGeneratorPromptTask extends BasePromptTaskService<BreadRecipeInput, BreadRecipeOutput> {
  constructor(config?: BasePromptServiceConfig) {
    const runner = config?.runner || new OpenRouterPromptRunner(ModelType.GEMINI_FLASH, 0.7);
    super({ runner });
  }

  /**
   * Override to provide structured output schema
   */
  protected getSchema(): z.ZodType {
    return BreadRecipeSchema;
  }

  /**
   * Override to validate input before processing
   */
  protected validateInput(input: BreadRecipeInput): void {
    if (!input.ingredients || input.ingredients.trim() === '') {
      throw new Error('Ingredients description must be provided');
    }
  }

  /**
   * Override to build the message array for the LLM prompt
   */
  protected buildMessages(input: BreadRecipeInput): Array<PromptRunnerTaskMessage> {
    return [
      { role: 'system', content: this.getSystemMessage(input) },
      { role: 'user', content: this.getUserMessage(input) }
    ];
  }

  /**
   * Set system message for the LLM
   */
  private getSystemMessage(input: BreadRecipeInput): string {
    return `You are a master baker and bread specialist. Create creative, delicious bread recipes that produce exceptional results.

Guidelines:
- Create innovative, flavorful bread recipes using the provided ingredients as inspiration
- Focus on proper bread-making techniques including fermentation, kneading, and baking
- Ensure the recipe produces a high-quality, delicious bread with excellent texture and flavor
- Include essential bread-making staples (flour, yeast, salt, water) if not mentioned, but build creatively around the provided ingredients
- Provide detailed, accurate baking instructions that will yield professional results
- Consider proper hydration, fermentation time, and baking temperatures for optimal results
- Include helpful baking tips, troubleshooting advice, and creative variations
- Make the recipe accessible while maintaining quality and deliciousness

Structure your response as a complete bread recipe with all required fields.`;
  }

  /**
   * Define the main prompt template
   */
  private getUserMessage(input: BreadRecipeInput): string {
    return `Create a creative and delicious bread recipe inspired by these ingredients:

${input.ingredients}

Please create a complete, innovative bread recipe that makes excellent use of these ingredients while following proper bread-making techniques. Focus on creating a bread that's not only delicious but also has great texture and flavor.`;
  }
}
