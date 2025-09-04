/**
 * Example Agent with the abstraction layer of llm services, uses vercel ai, openrouter, and the custom abstraction layer of llmServices/prompt runner.
*/


import chalk from 'chalk';
import promptSync from 'prompt-sync';
import { BreadRecipeAgentService, AnswerToolInput } from '../llmServices/agents/breadRecipeAgent';

// Get current date for seasonal awareness
const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

/**
 * Output formatted recipe information to console
 * @param recipeData The structured recipe data to display
 */
function outputRecipe(recipeData: AnswerToolInput): void {
  console.log(chalk.green('✅ Agent provided structured recipe:'));

  if (recipeData) {
    console.log(chalk.cyan('\n📋 Recipe Details:'));
    console.log(chalk.white(`Title: ${recipeData.title || 'N/A'}`));
    console.log(chalk.white(`Type: ${recipeData.breadType || 'N/A'}`));
    console.log(chalk.white(`Difficulty: ${recipeData.difficulty || 'N/A'}`));
    console.log(chalk.white(`Total Time: ${recipeData.totalTime || 'N/A'}`));
    console.log(chalk.white(`Serves: ${recipeData.servings || 'N/A'}`));

    if (recipeData.ingredients && recipeData.ingredients.length > 0) {
      console.log(chalk.cyan('\n🥕 Ingredients:'));
      recipeData.ingredients.forEach((ing: string, i: number) => {
        console.log(chalk.gray(`  - ${ing}`));
      });
    }

    if (recipeData.instructions && recipeData.instructions.length > 0) {
      console.log(chalk.cyan('\n👨‍🍳 Instructions:'));
      recipeData.instructions.forEach((step: string, i: number) => {
        console.log(chalk.gray(` - ${step}`));
      });
    }

    if (recipeData.tips && recipeData.tips.length > 0) {
      console.log(chalk.cyan('\n💡 Tips:'));
      recipeData.tips.forEach((tip: string, i: number) => {
        console.log(chalk.gray(`  • ${tip}`));
      });
    }
  }
}

/**
 * AGENT EXECUTION PATTERN DEMO
 * ===========================
 *
 * This function demonstrates the complete agent execution workflow:
 *
 * 1. AGENT INITIALIZATION:
 *    - Creates BreadRecipeAgentService instance
 *    - Configures with appropriate model (MISTRAL_8B for agent tasks)
 *    - Agent handles all complexity internally
 *
 * 2. AGENT EXECUTION:
 *    - Single execute() call triggers multi-step workflow
 *    - Agent manages conversation, tool calls, and state
 *    - Returns structured result when complete
 *
 * 3. RESULT PROCESSING:
 *    - Type-safe output from agent service
 *    - Structured data extraction and formatting
 *    - User-friendly display of results
 *
 * KEY BENEFITS:
 * - Clean separation between script and agent logic
 * - Agent encapsulates complex workflow management
 * - Script focuses on I/O and result presentation
 * - Easy to test and maintain agent independently
 */
export const createBreadRecipe = async (userPrompt?: string) => {
  console.log(chalk.magenta('\n🥖 Interactive Bread Recipe Agent 🥖'));
  console.log(chalk.gray(`Today is ${currentDate}`));
  console.log(chalk.cyan('Starting interactive agent conversation...\n'));

  console.log(chalk.yellow('🤖 Agent will ask for your preferences to create a personalized recipe'));
  console.log(chalk.gray('You can answer questions as they come up...\n'));

  try {
    // Create the agent service
    const agentService = new BreadRecipeAgentService();

    // Execute the agent
    const result = await agentService.execute({
      userPrompt: userPrompt
    });

    console.log(chalk.yellow('\n📝 Agent Final Response:'));
    console.log(chalk.white('Agent conversation completed'));

    // Check if we have a recipe
    if (result.success && result.recipe) {
      // Output the recipe using the dedicated output function
      outputRecipe(result.recipe);
    } else {
      console.log(chalk.yellow('⚠️  Agent completed but did not provide a recipe.'));
      console.log(chalk.gray(result.error || 'The agent may need clearer instructions or the workflow may need adjustment.'));
    }

    return result;

  } catch (error) {
    console.error(chalk.red('❌ Error:'), error);
    throw error;
  }
};

async function main() {
  try {
    await createBreadRecipe();
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

main();
