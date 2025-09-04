/**
 * Example Workflow with the abstraction layer of llm services, uses vercel ai, openrouter, and the custom abstraction layer of llmServices/prompt runner. 
 * Orchestrates multiple single LLM calls into a workflow.
*/

import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import promptSync from 'prompt-sync';
import { BreadRecipeGeneratorPromptTask } from '../llmServices/promptTasks/breadRecipeGeneratorPromptTask';
import { CreativeBreadIngredientsPromptTask } from '../llmServices/promptTasks/creativeBreadIngredientsTask';
import { ScriptSaveService } from '../services/scriptSaveData/scriptSaveService';
import { SaveFormat } from '../services/scriptSaveData/types';

interface ScriptParams {
  theme?: string;
  save?: boolean;
}

async function parseArguments(): Promise<ScriptParams> {
  const argv = await yargs(hideBin(process.argv))
    .option('theme', {
      type: 'string',
      description: 'Theme for creative ingredients (e.g., "herbs and cheese", "sweet and fruity")'
    })
    .option('save', {
      type: 'boolean',
      description: 'Save the recipe to a file',
      default: true
    })
    .parseAsync();

  return { ...argv };
}

/**
 * PROMPT TASK EXECUTION PATTERN DEMO
 * ==================================
 *
 * This function demonstrates the complete prompt task workflow:
 *
 * 1. INPUT COLLECTION:
 *    - Command-line argument parsing with yargs
 *    - Interactive user input with prompt-sync
 *    - Flexible input handling (user-provided or AI-generated)
 *
 * 2. SERVICE COMPOSITION:
 *    - Multiple prompt tasks working together
 *    - CreativeBreadIngredientsPromptTask for ingredient generation
 *    - BreadRecipeGeneratorPromptTask for recipe creation
 *    - Each service handles one specific responsibility
 *
 * 3. STRUCTURED OUTPUT PROCESSING:
 *    - Type-safe results from Zod-validated LLM responses
 *    - Direct property access without parsing
 *    - Rich formatting and user-friendly display
 *
 * 4. PERSISTENCE INTEGRATION:
 *    - Optional file saving with ScriptSaveService
 *    - Markdown formatting for documentation
 *    - Clean separation of concerns
 *
 * KEY BENEFITS:
 * - Simple, linear execution flow
 * - Easy to understand and debug
 * - Each step is a focused, testable operation
 * - Clear data flow from input to output
 */
async function main() {
  console.log(chalk.yellow('🥖 Welcome to the Bread Recipe Generator! 🥖'));
  console.log(chalk.gray('Let\'s create something delicious together...\n'));

  const params = await parseArguments();
  const prompt = promptSync({ sigint: true });
  const saveService = new ScriptSaveService();

  // Step 1: Get ingredients
  console.log(chalk.blue('📝 First, let\'s talk ingredients!'));
  console.log(chalk.gray('Do you have any special ingredients you\'d like to use?'));

  const userIngredients = prompt('Enter ingredients (or press Enter for creative suggestions): ').trim();

  let ingredients: string;

  if (!userIngredients) {
    // CREATIVE INGREDIENTS PATTERN
    // ===========================
    // When user doesn't provide ingredients, we use AI to generate creative combinations.
    // This demonstrates:
    // - Service composition (one LLM service calling another)
    // - Theme-based content generation
    // - Structured output handling (array of ingredients)
    // - User choice between manual input and AI assistance
    console.log(chalk.cyan('\n🎨 Getting creative with ingredients...'));

    const ingredientsService = new CreativeBreadIngredientsPromptTask();
    const ingredientsResult = await ingredientsService.execute({
      theme: params.theme
    });

    ingredients = ingredientsResult.ingredients.join(', ');
    console.log(chalk.green('✨ Creative ingredients selected:'));
    console.log(chalk.white(ingredients));
    console.log();
  } else {
    ingredients = userIngredients;
    console.log(chalk.green('🍞 Using your ingredients:'));
    console.log(chalk.white(ingredients));
    console.log();
  }

  // Step 2: Generate bread recipe
  console.log(chalk.blue('👨‍🍳 Creating your bread recipe...'));

  // LLM SERVICE ABSTRACTION DEMO
  // ===========================
  // The BreadRecipeGeneratorPromptTask is an abstraction
  // built on top of the Vercel AI SDK that handles all the complexity:
  // - Schema validation with Zod
  // - Model configuration and provider setup
  // - Error handling and retries
  // - Type-safe structured outputs
  // Without this abstraction, you'd need 20+ lines of AI SDK code here. 
  // This simplicity helps with Cursor AI consistency and reliable code generation.
  const recipeService = new BreadRecipeGeneratorPromptTask();
  const recipeResult = await recipeService.execute({
    ingredients: ingredients
  });

  // Step 3: Display the recipe
  console.log(chalk.yellow('\n🎉 Your Bread Recipe is Ready! 🎉\n'));

  console.log(chalk.magenta('📖', recipeResult.title));
  console.log(chalk.gray('═'.repeat(50)));
  console.log(chalk.white(recipeResult.description));
  console.log();

  console.log(chalk.cyan('⏱️  Timing:'));
  console.log(chalk.white(`   Prep: ${recipeResult.prepTime}`));
  console.log(chalk.white(`   Bake: ${recipeResult.cookTime}`));
  console.log(chalk.white(`   Total: ${recipeResult.totalTime}`));
  console.log(chalk.white(`   Difficulty: ${recipeResult.difficulty}`));
  console.log(chalk.white(`   Yields: ${recipeResult.servings} loaves`));
  console.log();

  console.log(chalk.cyan('🛒 Ingredients:'));
  recipeResult.ingredients.forEach((ingredient, index) => {
    console.log(chalk.white(`   ${index + 1}. ${ingredient}`));
  });
  console.log();

  console.log(chalk.cyan('📋 Instructions:'));
  recipeResult.instructions.forEach((instruction, index) => {
    console.log(chalk.white(`   ${index + 1}. ${instruction}`));
  });
  console.log();

  if (recipeResult.tips.length > 0) {
    console.log(chalk.cyan('💡 Tips:'));
    recipeResult.tips.forEach((tip, index) => {
      console.log(chalk.white(`   • ${tip}`));
    });
    console.log();
  }

  // Step 4: Save if requested
  if (params.save) {
    console.log(chalk.blue('💾 Saving your recipe...'));

    let markdown = `# ${recipeResult.title}\n\n`;
    markdown += `## Description\n${recipeResult.description}\n\n`;
    markdown += `## Details\n`;
    markdown += `- **Prep Time:** ${recipeResult.prepTime}\n`;
    markdown += `- **Bake Time:** ${recipeResult.cookTime}\n`;
    markdown += `- **Total Time:** ${recipeResult.totalTime}\n`;
    markdown += `- **Difficulty:** ${recipeResult.difficulty}\n`;
    markdown += `- **Yields:** ${recipeResult.servings} loaves\n\n`;

    markdown += `## Ingredients\n`;
    recipeResult.ingredients.forEach((ingredient, index) => {
      markdown += `${index + 1}. ${ingredient}\n`;
    });
    markdown += `\n`;

    markdown += `## Instructions\n`;
    recipeResult.instructions.forEach((instruction, index) => {
      markdown += `${index + 1}. ${instruction}\n`;
    });
    markdown += `\n`;

    if (recipeResult.tips.length > 0) {
      markdown += `## Tips\n`;
      recipeResult.tips.forEach(tip => {
        markdown += `- ${tip}\n`;
      });
    }

    saveService.saveData(markdown, { format: SaveFormat.MARKDOWN });

    console.log(chalk.green('✅ Recipe saved successfully!'));
  }

  console.log(chalk.yellow('\n🍞 Happy baking! Enjoy your delicious creation! 🍞'));
}

main().catch(error => {
  console.error(chalk.red('❌ Error:'), error.message);
  process.exit(1);
});
