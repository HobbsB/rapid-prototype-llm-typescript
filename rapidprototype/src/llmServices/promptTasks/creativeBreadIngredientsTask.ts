import { z } from 'zod';
import { BasePromptTaskService, BasePromptServiceConfig } from '../basePromptTaskService';
import { OpenRouterPromptRunner, ModelType } from '../../services/llmProviders/openRouterPromptRunner';
import { PromptRunnerTaskMessage } from '../../services/llmProviders/promptRunnerInterface';

// Define the schema for the creative bread ingredients output
export const CreativeBreadIngredientsSchema = z.object({
  ingredients: z.array(z.string()).describe('5-8 creative and fun ingredients for making delicious bread')
});

export type CreativeBreadIngredientsOutput = z.infer<typeof CreativeBreadIngredientsSchema>;

export interface CreativeBreadIngredientsInput {
  theme?: string;
}

/**
 * Service for generating creative and fun ingredients for bread making using LLM
 */
export class CreativeBreadIngredientsPromptTask extends BasePromptTaskService<CreativeBreadIngredientsInput, CreativeBreadIngredientsOutput> {
  constructor(config?: BasePromptServiceConfig) {
    const runner = config?.runner || new OpenRouterPromptRunner(ModelType.GEMINI_FLASH, 0.7);
    super({ runner });
  }

  /**
   * Override to provide structured output schema
   */
  protected getSchema(): z.ZodType {
    return CreativeBreadIngredientsSchema;
  }

  /**
   * Override to validate input before processing
   */
  protected validateInput(input: CreativeBreadIngredientsInput): void {
    // No validation needed - theme is optional
  }

  /**
   * Override to build the message array for the LLM prompt
   */
  protected buildMessages(input: CreativeBreadIngredientsInput): Array<PromptRunnerTaskMessage> {
    return [
      { role: 'system', content: this.getSystemMessage(input) },
      { role: 'user', content: this.getUserMessage(input) }
    ];
  }

  /**
   * Set system message for the LLM
   */
  private getSystemMessage(input: CreativeBreadIngredientsInput): string {
    return `You are a creative home baker with a well-stocked pantry, excited about making delicious and innovative breads. You're taking stock of your ingredients and need to select 5-8 creative ingredients that would work great together for a unique and delicious bread.

You're the type of baker who loves experimenting with flavors and textures - mixing sweet and savory, incorporating herbs and spices, using cheeses and nuts, or getting creative with fruits and vegetables in unexpected ways.

When selecting ingredients, consider these categories:
- Flavor enhancers (herbs, spices, cheeses, nuts, dried fruits)
- Texture add-ins (seeds, grains, nuts)
- Moisture and richness (oils, butters, milks, fruits)
- Unexpected but delicious twists (vegetables, specialty items)

IMPORTANT: Select exactly 5-8 ingredients that complement each other well and would create a cohesive, delicious bread. Focus on creative, fun ingredients that will make the bread special and unique. Always include essential bread staples like flour, yeast, salt, but prioritize the creative flavor ingredients.`;
  }

  /**
   * Define the main prompt template
   */
  private getUserMessage(input: CreativeBreadIngredientsInput): string {
    const themePrompt = input.theme
      ? `I'm thinking of making bread with a ${input.theme} theme.`
      : `I'm feeling creative and want to make something fun and delicious.`;

    return `Hey there! I'm in my kitchen, looking through my pantry, and I'm getting inspired to make some amazing bread. ${themePrompt}

I need to select exactly 5-8 ingredients that will work together beautifully to create a unique and delicious bread. Let me carefully choose from what I have:

What 5-8 ingredients should I select that would complement each other perfectly? I want a good balance of flavors, textures, and creativity that will result in an outstanding loaf of bread.

Consider these ingredients I have available: bread flour, active dry yeast, sea salt, unsalted butter, extra virgin olive oil, honey, fresh rosemary, fresh thyme, everything bagel seasoning, asiago cheese, feta cheese, walnuts, pecans, dried cranberries, sunflower seeds, pumpkin seeds, whole wheat flour, rye flour, garlic powder, onion powder, black pepper, sundried tomatoes, artichoke hearts, jalapenos, parmesan cheese, blue cheese, dried apricots, chia seeds, sesame seeds, poppy seeds, fresh chives, smoked paprika, brown sugar, instant coffee granules, cocoa powder, cinnamon, cardamom, nutmeg, almonds, hazelnuts, dates, figs, olives, roasted garlic, sweet potato, butternut squash, carrots, zucchini, red pepper flakes, lemon zest, orange zest, maple syrup, buttermilk, eggs, milk, heavy cream.

Select 5-8 ingredients that will create a cohesive, delicious bread with great flavor combinations and interesting textures.`;
  }
}
