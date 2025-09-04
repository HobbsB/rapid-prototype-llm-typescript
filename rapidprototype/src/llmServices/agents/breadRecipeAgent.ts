import { z } from 'zod';
import { BaseAgentService, BaseAgentServiceConfig, SimpleAgentConfig } from '../baseAgentService';
import { OpenRouterPromptRunner, ModelType } from '../../services/llmProviders/openRouterPromptRunner';
import { tool, ToolSet, GenerateTextResult } from 'ai';
import { IngredientsExtractorPromptTask } from '../promptTasks/ingredientsExtractorPromptTask';
import promptSync from 'prompt-sync';

// ===== TYPE DEFINITIONS =====

/** Input for BreadRecipeAgentService */
export interface BreadRecipeAgentInput {
  userPrompt?: string;
}

/** Output from BreadRecipeAgentService */
export interface BreadRecipeAgentOutput {
  recipe?: AnswerToolInput;
  success: boolean;
  error?: string;
}


/** Input for answer tool (structured recipe data) */
export interface AnswerToolInput {
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


// ===== TOOL SPECIFIC TYPE DEFINITIONS =====

/** Input for getBreadTypes tool */
interface GetBreadTypesInput {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}
  
/** Output from getBreadTypes tool */
interface GetBreadTypesOutput {
  skillLevel: string;
  breadTypes: string[];
  descriptions: Record<string, string>;
  error?: string; 
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
  error?: string; 
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
  error?: string; 
}


/**
 * Bread Recipe Agent Service - Interactive Recipe Generation
 * ========================================================
 *
 * This agent demonstrates advanced patterns for building interactive LLM assistants:
 *
 * TOOL DESIGN PATTERNS:
 * =====================
 * 1. ACTION TOOLS: Perform operations and return data (getBreadTypes, getIngredients)
 *    - Execute functions that gather/process information
 *    - Return structured data for agent to use
 *
 * 2. USER INTERACTION TOOLS: Gather human input (requestUserInput)
 *    - Break complex workflows into manageable steps
 *    - Collect preferences incrementally
 *
 * 3. TERMINATION TOOLS: End agent and return final result (answer)
 *    - No execute function - calling this tool terminates the agent
 *    - Returns structured final output
 *
 * WORKFLOW ENGINEERING:
 * ====================
 * - Phase-based progression (gather preferences → generate recipe → finalize)
 * - Loop prevention with usage limits and clear termination conditions
 * - Fallback logic for indecisive users ("you choose" scenarios)
 * - Error handling that allows agent to retry or recover
 *
 * PROMPT ENGINEERING PRINCIPLES:
 * =============================
 * - Clear role definition and workflow phases
 * - Specific tool usage rules and restrictions
 * - Quality gates and completion criteria
 * - User-friendly error recovery
 */
export class BreadRecipeAgentService extends BaseAgentService<BreadRecipeAgentInput, BreadRecipeAgentOutput> {

  constructor(config?: BaseAgentServiceConfig) {
    const runner = config?.runner || new OpenRouterPromptRunner(ModelType.GPT_OSS_20B_HIGH, 0.7);
    super({ runner });
  }
  
  protected getAgentConfig(): Partial<SimpleAgentConfig> {
    return {
      toolChoice: 'required', // Force agent to use tools for interactive behavior
      maxSteps: 10, // Allow more steps for interactive conversation
      debug: true // print tool call information per step
    };
  }

  protected getSystemPrompt(input: BreadRecipeAgentInput): string {
    return `You are a helpful bread baking assistant focused on creating personalized recipes through interactive conversation.

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
  }

  protected getInitialPrompt(input: BreadRecipeAgentInput): string {
    return input.userPrompt || `Help me create a personalized bread recipe. Start by using the requestUserInput tool to ask about my baking skill level so you can recommend appropriate recipes.`;
  }


  protected getTools(): ToolSet {
    return {
        getBreadTypes: getBreadTypesTool,
        getIngredients: getIngredientsTool,
        requestUserInput: requestUserInputTool,
        answer: answerTool
      };    
  }

  protected processAgentResult(result: GenerateTextResult<ToolSet, never>): BreadRecipeAgentOutput {
    // Extract answer if it was called
    const answerToolCall = result.toolCalls?.find(call => call.toolName === 'answer');

    if (answerToolCall) {
      // Use helper function to safely extract recipe data with proper typing
      const recipeData = extractAnswerData(answerToolCall);

      if (recipeData) {
        return {
          recipe: recipeData,
          success: true
        };
      }
    }

    // If no answer tool was called, return the text response
    return {
      success: false,
      error: 'Agent completed but did not call the answer tool'
    };
  }
}

const getBreadTypesTool = tool({
    description: 'Get a list of available bread types and their characteristics based on skill level',
    inputSchema: z.object({
      skillLevel: z.enum(['beginner', 'intermediate', 'advanced'])
        .describe('Baking skill level: beginner (basic recipes), intermediate (moderate complexity), advanced (expert techniques)')
    }),
    execute: async ({ skillLevel }: GetBreadTypesInput): Promise<GetBreadTypesOutput> => {
      try {
        console.log(`🍞 Getting bread types for ${skillLevel} skill level...`);

        const breadTypes = {
          beginner: ['Simple White Bread', 'No-Knead Bread', 'Quick Bread'],
          intermediate: ['Sourdough', 'Whole Wheat', 'Artisan Bread', 'Herb Bread'],
          advanced: ['Multi-grain Sourdough', 'Brioche', 'Rye Bread', 'Ciabatta']
        };

        const availableTypes = breadTypes[skillLevel as keyof typeof breadTypes] || breadTypes.beginner;

        console.log(`✅ Available bread types: ${availableTypes.join(', ')}`);

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
        console.error(`❌ Error in getBreadTypes tool:`, error);
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

// ===== TOOLS =====

const getIngredientsTool = tool({
    description: 'Get the ingredients needed to make a specific type of bread',
    inputSchema: z.object({
      breadType: z.string().describe('The type of bread to get ingredients for'),
      dietaryPreferences: z.array(z.string()).optional().describe('Any dietary restrictions to consider')
    }),
    execute: async ({ breadType, dietaryPreferences = [] }: GetIngredientsInput): Promise<GetIngredientsOutput> => {
      try {
        console.log(`🥕 Getting ingredients for ${breadType} using AI...`);

        // Create the LLM service instance
        const ingredientsService = new IngredientsExtractorPromptTask();

        // Call the LLM service to get dynamic ingredients
        const result = await ingredientsService.execute({
          breadType,
          dietaryPreferences
        });

        console.log(`✅ AI-generated ingredients for ${breadType}:`);
        result.ingredients.forEach(ing => console.log(`  • ${ing}`));

        return result;
      } catch (error) {
        console.error(`❌ Error in getIngredients tool:`, error);
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

const requestUserInputTool = tool({
    description: 'REQUIRED: Ask user questions to gather preferences for personalized recipes. Use this tool immediately when you need user input.',
    inputSchema: z.object({
      question: z.string().describe('Clear, specific question for the user'),
      context: z.string().describe('Why you need this information for the recipe')
    }),
    execute: async ({ question, context }: RequestUserInputInput): Promise<RequestUserInputOutput> => {
      try {
        console.log(`\n🤔 ${question}`);
        console.log(`💭 ${context}`);

        // Create prompt-sync instance for interactive input
        const prompt = promptSync({ sigint: true });
        const userResponse = prompt('Your answer: ');

        console.log(`📝 User responded: ${userResponse || 'No response'}`);

        return {
          userResponse: userResponse || 'No response provided',
          timestamp: new Date().toISOString(),
          context: context,
          question: question
        };
      } catch (error) {
        console.error(`❌ Error in requestUserInput tool:`, error);
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

// ===== HELPER FUNCTIONS =====
  
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
  