
/**
 * Example Agent without the abstraction layer of llmServices, using vercel ai sdk directly and openrouter
*/


import chalk from 'chalk';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, stepCountIs, tool } from 'ai';
import { z } from 'zod';
import { config } from '../config';
import promptSync from 'prompt-sync';
import { IngredientsExtractorPromptTask } from '../llmServices/promptTasks/ingredientsExtractorPromptTask';

// Get current date for seasonal awareness
const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

// ===== TYPE DEFINITIONS =====

/** Input for getBreadTypes tool */
interface GetBreadTypesInput {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

/** Output from getBreadTypes tool */
interface GetBreadTypesOutput {
  skillLevel: string;
  breadTypes: string[];
  descriptions: Record<string, string>;
  error?: string; // Optional error field for error reporting to LLM
}

/** Input for getIngredients tool */
interface GetIngredientsInput {
  breadType: string;
  dietaryPreferences?: string[];
}

/** Output from getIngredients tool */
interface GetIngredientsOutput {
  breadType: string;
  ingredients: string[];
  estimatedCost: string;
  prepTime: string;
  bakeTime: string;
  error?: string; // Optional error field for error reporting to LLM
}

/** Input for answer tool (structured recipe data) */
interface AnswerToolInput {
  title: string;
  breadType: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  totalTime: string;
  servings: number;
  ingredients: string[];
  instructions: string[];
  tips: string[];
  nutritionNotes?: string;
}

/** Input for requestUserInput tool */
interface RequestUserInputInput {
  question: string;
  context: string;
}

/** Output from requestUserInput tool */
interface RequestUserInputOutput {
  userResponse: string;
  timestamp: string;
  context: string;
  question: string;
  error?: string; // Optional error field for error reporting to LLM
}

/** Union type for all tool inputs */
type ToolInput = GetBreadTypesInput | GetIngredientsInput | AnswerToolInput | RequestUserInputInput;

/** Union type for all tool outputs */
type ToolOutput = GetBreadTypesOutput | GetIngredientsOutput | AnswerToolInput | RequestUserInputOutput;

/** Properly typed tool call interface matching Vercel AI SDK structure */
interface TypedToolCall {
  toolName: string;
  input: ToolInput;
  result?: ToolOutput;
}

/** Type guard to check if tool call is for answer tool */
function isAnswerToolCall(call: any): call is { toolName: 'answer'; input: AnswerToolInput } {
  return call?.toolName === 'answer' && call?.input !== undefined;
}

/** Helper function to safely extract answer tool data */
function extractAnswerData(toolCall: any): AnswerToolInput | null {
  if (isAnswerToolCall(toolCall)) {
    return toolCall.input as AnswerToolInput;
  }
  return null;
}

/**
 * Output formatted recipe information to console
 * @param recipeData The structured recipe data to display
 */
function outputRecipe(recipeData: AnswerToolInput & { error?: string }): void {
  console.log(chalk.green('✅ Agent provided structured recipe:'));

  if (recipeData) {
    // Check if there's an error in the recipe data
    if (recipeData.error) {
      console.log(chalk.red(`⚠️  Recipe generation error: ${recipeData.error}`));
      return;
    }

    console.log(chalk.cyan('\n📋 Recipe Details:'));
    console.log(chalk.white(`Title: ${recipeData.title || 'N/A'}`));
    console.log(chalk.white(`Type: ${recipeData.breadType || 'N/A'}`));
    console.log(chalk.white(`Difficulty: ${recipeData.difficulty || 'N/A'}`));
    console.log(chalk.white(`Total Time: ${recipeData.totalTime || 'N/A'}`));
    console.log(chalk.white(`Serves: ${recipeData.servings || 'N/A'}`));

    if (recipeData.ingredients && recipeData.ingredients.length > 0) {
      console.log(chalk.cyan('\n🥕 Ingredients:'));
      recipeData.ingredients.forEach((ing: string, i: number) => {
        console.log(chalk.gray(` - ${ing}`));
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


// Tool 1: Get available bread types
const getBreadTypesTool = tool({
  description: 'Get a list of available bread types and their characteristics based on skill level',
  inputSchema: z.object({
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced'])
      .describe('Baking skill level: beginner (basic recipes), intermediate (moderate complexity), advanced (expert techniques)')
  }),
  execute: async ({ skillLevel }: GetBreadTypesInput): Promise<GetBreadTypesOutput> => {
    try {
      console.log(chalk.blue(`🍞 Getting bread types for ${skillLevel} skill level...`));

      const breadTypes = {
        beginner: ['Simple White Bread', 'No-Knead Bread', 'Quick Bread'],
        intermediate: ['Sourdough', 'Whole Wheat', 'Artisan Bread', 'Herb Bread'],
        advanced: ['Multi-grain Sourdough', 'Brioche', 'Rye Bread', 'Ciabatta']
      };

      const availableTypes = breadTypes[skillLevel as keyof typeof breadTypes] || breadTypes.beginner;

      console.log(chalk.green(`✅ Available bread types: ${availableTypes.join(', ')}`));

      return {
        skillLevel,
        breadTypes: availableTypes,
        descriptions: {
          'Simple White Bread': 'Basic yeast bread, perfect for beginners',
          'No-Knead Bread': 'Easy overnight method, minimal effort',
          'Quick Bread': 'No yeast required, fast to make',
          'Sourdough': 'Tangy flavor, requires starter',
          'Whole Wheat': 'Healthier option with wheat flour',
          'Artisan Bread': 'Professional-quality rustic bread',
          'Herb Bread': 'Flavored with fresh herbs and spices',
          'Multi-grain Sourdough': 'Complex multi-grain bread with sourdough',
          'Brioche': 'Rich, buttery French bread',
          'Rye Bread': 'Dense bread with rye flour',
          'Ciabatta': 'Italian bread with large holes'
        }
      };
    } catch (error) {
      console.error(chalk.red(`❌ Error in getBreadTypes tool:`), error);
      // Return error info so LLM can see what went wrong and potentially retry
      return {
        skillLevel: 'error',
        breadTypes: [],
        descriptions: {},
        error: `Failed to get bread types: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

// Tool 2: Get ingredients for a specific bread type
const getIngredientsTool = tool({
  description: 'Get the ingredients needed to make a specific type of bread',
  inputSchema: z.object({
    breadType: z.string().describe('The type of bread to get ingredients for'),
    dietaryPreferences: z.array(z.string()).optional().describe('Any dietary restrictions to consider')
  }),
  execute: async ({ breadType, dietaryPreferences = [] }: GetIngredientsInput): Promise<GetIngredientsOutput> => {
    try {
      console.log(chalk.blue(`🥕 Getting ingredients for ${breadType} using AI...`));

      // Create the LLM service instance
      const ingredientsService = new IngredientsExtractorPromptTask();

      // Call the LLM service to get dynamic ingredients
      const result = await ingredientsService.execute({
        breadType,
        dietaryPreferences
      });

      console.log(chalk.green(`✅ AI-generated ingredients for ${breadType}:`));
      result.ingredients.forEach(ing => console.log(chalk.gray(`  • ${ing}`)));

      return result;
    } catch (error) {
      console.error(chalk.red(`❌ Error in getIngredients tool:`), error);
      // Return error info so LLM can see what went wrong and potentially retry
      return {
        breadType: 'error',
        ingredients: [],
        estimatedCost: '$0',
        prepTime: '0 minutes',
        bakeTime: '0 minutes',
        error: `Failed to get ingredients for ${breadType}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

// Tool 3: Answer tool - provides final structured recipe (terminates agent)
const answerTool = tool({
  description: 'Provide the final complete bread recipe with all details',
  inputSchema: z.object({
    title: z.string().describe('Recipe title'),
    breadType: z.string().describe('Type of bread'),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe('Difficulty level'),
    totalTime: z.string().describe('Total time required'),
    servings: z.number().describe('Number of servings'),
    ingredients: z.array(z.string()).describe('List of ingredients with quantities'),
    instructions: z.array(z.string()).describe('Step-by-step instructions'),
    tips: z.array(z.string()).describe('Helpful baking tips'),
    nutritionNotes: z.string().optional().describe('Optional nutrition information')
  })
  // No execute function - this terminates the agent and returns the structured result
});

// Tool 4: Request user input for clarification
const requestUserInputTool = tool({
  description: 'REQUIRED: Ask user questions to gather preferences for personalized recipes. Use this tool immediately when you need user input.',
  inputSchema: z.object({
    question: z.string().describe('Clear, specific question for the user'),
    context: z.string().describe('Why you need this information for the recipe')
  }),
  execute: async ({ question, context }: RequestUserInputInput): Promise<RequestUserInputOutput> => {
    try {
      console.log(chalk.yellow(`\n🤔 ${question}`));
      console.log(chalk.gray(`💭 ${context}`));

      const prompt = promptSync({ sigint: true });
      const userResponse = prompt('Your answer: ');

      console.log(chalk.green(`📝 User responded: ${userResponse || 'No response'}`));

      return {
        userResponse: userResponse || 'No response provided',
        timestamp: new Date().toISOString(),
        context: context,
        question: question
      };
    } catch (error) {
      console.error(chalk.red(`❌ Error in requestUserInput tool:`), error);
      // Return error info so LLM can see what went wrong and potentially retry
      return {
        userResponse: 'Error occurred during input',
        timestamp: new Date().toISOString(),
        context: context,
        question: question,
        error: `Failed to get user input: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

// Tools collection
const tools = {
  getBreadTypes: getBreadTypesTool,
  getIngredients: getIngredientsTool,
  requestUserInput: requestUserInputTool,
  answer: answerTool
};

// Enhanced system prompt with interactive capabilities
const systemPrompt = `You are a helpful bread baking assistant focused on creating personalized recipes through interactive conversation.

CRITICAL WORKFLOW:
1. Ask user's skill level using requestUserInput
2. Ask about preferred flavors using requestUserInput
3. Call getBreadTypes based on skill level
4. If user wants suggestions, pick a bread type yourself and call getIngredients
5. If user is indecisive, suggest a popular option and proceed
6. ALWAYS call answer tool to provide the final recipe - do not get stuck in loops

TOOL USAGE RULES:
- Use requestUserInput only for gathering initial preferences
- After gathering preferences, proceed with recipe creation
- If user says "you choose" or "I don't know", make a good suggestion and proceed
- Use getBreadTypes and getIngredients to gather recipe data
- END with answer tool - provide complete recipe and stop

BREAK OUT OF LOOPS: If you've asked the same question more than once, make a decision and proceed with recipe creation.

Available tools:
- requestUserInput: For initial user preferences only
- getBreadTypes: Get bread types for skill level
- getIngredients: Get ingredients for chosen bread
- answer: FINAL STEP - provide complete recipe`;

// Main agent function with proper conversation loop
export const createBreadRecipe = async (userPrompt?: string) => {
  const openrouter = createOpenRouter({
    apiKey: config.openRouterApiKey,
  });

  const initialPrompt = userPrompt || `Help me create a personalized bread recipe. Start by using the requestUserInput tool to ask about my baking skill level so you can recommend appropriate recipes.`;

  console.log(chalk.magenta('\n🥖 Interactive Bread Recipe Agent 🥖'));
  console.log(chalk.gray(`Today is ${currentDate}`));
  console.log(chalk.cyan('Starting interactive agent conversation...\n'));

  console.log(chalk.yellow('🤖 Agent will ask for your preferences to create a personalized recipe'));
  console.log(chalk.gray('You can answer questions as they come up...\n'));

  try {
    const result = await generateText({
      model: openrouter('mistralai/ministral-8b'),
      prompt: initialPrompt,
      system: systemPrompt,
      tools: tools,
      toolChoice: 'required', // Force agent to use tools for interactive behavior
      stopWhen: stepCountIs(10), // Allow more steps for interactive conversation
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        console.log(chalk.blue(`\n🔄 Step completed - Finish Reason: ${finishReason}`));
        if (toolCalls && toolCalls.length > 0) {
          const toolNames = toolCalls.map(call => call.toolName).join(', ');
          console.log(chalk.gray(`🔧 Tools called: ${toolNames}`));

          // Special handling for interactive tool calls
          if (toolNames.includes('requestUserInput')) {
            console.log(chalk.cyan('💬 Agent is asking for user input...'));
          }
        }
        if (usage) {
          console.log(chalk.gray(`📊 Usage: ${JSON.stringify(usage)}`));
        }
        if (text) {
          console.log(chalk.gray(`💭 Agent: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`));
        }
      }
    });

    console.log(chalk.yellow('\n📝 Agent Final Response:'));
    console.log(chalk.white(result.text || 'No text response'));
    console.log();

    // Show tool calls summary
    if (result.steps && result.steps.length > 0) {
      console.log(chalk.blue('🔧 Tool Calls Summary:'));
      result.steps.forEach((step, index) => {
        if (step.toolCalls && step.toolCalls.length > 0) {
          console.log(chalk.gray(`  Step ${index + 1}: ${step.toolCalls.map(call => call.toolName).join(', ')}`));
        }
      });
      console.log();
    }

    // Extract answer if it was called
    const answerToolCall = result.toolCalls?.find(call => call.toolName === 'answer');

    if (answerToolCall) {
      // Use helper function to safely extract recipe data with proper typing
      const recipeData = extractAnswerData(answerToolCall);

      if (recipeData) {
        // Output the recipe using the dedicated output function
        outputRecipe(recipeData);
      } else {
        console.log(chalk.yellow('⚠️  Answer tool called but recipe data not found'));
      }
    } else {
      console.log(chalk.yellow('⚠️  Agent completed but did not call the answer tool.'));
      console.log(chalk.gray('The agent may need clearer instructions or the workflow may need adjustment.'));
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
