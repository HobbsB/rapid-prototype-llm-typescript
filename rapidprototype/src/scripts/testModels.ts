/**
 * Tests the models preconfigured in the openrouter prompt runner abstraction layer. 
 * Tests both that they work and for reliability of the models when using structured outputs (json schema), since LLM models are nondeterministic.
 * Models set up currently are all great, prefiltered for various levels of costs + intelligence + consistency (mostly).
 * Model comparison can be found at https://artificialanalysis.ai/models 
*/

import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { TestModelPromptTask } from '../llmServices/promptTasks/testModelPromptTask';
import { OpenRouterPromptRunner, ModelType } from '../services/llmProviders/openRouterPromptRunner';
import { AsyncRateLimiter, AsyncRateLimiterConfig } from '../services/rateLimiter/asyncRateLimiter';
import { ScriptSaveService } from '../services/scriptSaveData/scriptSaveService';
import { CognitiveEffortOutput } from '../llmServices/promptTasks/testModelPromptTask';

interface ScriptParams {
  all: boolean;
  model?: ModelType;
  attempts: number;
  save: boolean;
}

interface TestRequest {
  id: number;
  modelType: ModelType;
}

interface TestResult {
  requestId: number;
  modelType: ModelType;
  response?: CognitiveEffortOutput;
  status: 'success' | 'partial' | 'failed';
  error?: string;
  executionTime: number;
  tokenCount?: number;
}

interface ModelStats {
  modelType: ModelType;
  totalCalls: number;
  successes: number;
  partials: number;
  failures: number;
  successRate: number;
  averageTime: number;
  averageTokens: number;
}

async function parseArguments(): Promise<ScriptParams> {
  const argv = await yargs(hideBin(process.argv))
    .option('all', {
      type: 'boolean',
      description: 'Run test across all available models',
      conflicts: 'model'
    })
    .option('model', {
      type: 'string',
      description: 'Specific model to test (use ModelType enum value)',
      choices: Object.values(ModelType)
    })
    .option('attempts', {
      type: 'number',
      description: 'Number of attempts per model (default: 3)',
      default: 3
    })
    .option('save', {
      type: 'boolean',
      description: 'Save all responses to JSON file',
      default: false
    })
    .parseAsync();

  return argv as ScriptParams;
}

function getSelectedModels(params: ScriptParams): ModelType[] {
  // If --all flag is provided, use all models
  if (params.all) {
    return Object.values(ModelType);
  }

  // If specific model is provided, use that
  if (params.model) {
    return [params.model];
  }

  // Default to GEMINI_CHEAP if neither --all nor --model is provided
  return [ModelType.GPT_OSS_20B_HIGH];
}

function validateModelResponse(response: CognitiveEffortOutput): 'success' | 'partial' {
  // Check if we have exactly 5 classifications
  if (!response.classifications || response.classifications.length !== 5) {
    return 'partial';
  }

  // Check each classification has required fields with minimum length
  for (const classification of response.classifications) {
    if (
      !classification.activity ||
      !classification.category ||
      !classification.reasoning ||
      classification.activity.length < 3 ||
      classification.category.length < 3 ||
      classification.reasoning.length < 3
    ) {
      return 'partial';
    }
  }

  return 'success';
}

async function testModelWithPrompt(
  modelType: ModelType,
  requestId: number
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Create prompt runner with specific model
    const runner = new OpenRouterPromptRunner(modelType, 0.7);
    const promptTask = new TestModelPromptTask({ runner });

    // Execute the prompt
    const response = await promptTask.execute();

    // Validate the response
    const status = validateModelResponse(response);
    const executionTime = Date.now() - startTime;

    return {
      requestId,
      modelType,
      response,
      status,
      executionTime,
      tokenCount: 0 // We'll need to get this from the runner if available
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      requestId,
      modelType,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime
    };
  }
}

function generateReport(modelStats: ModelStats[], allResults: TestResult[]): void {
  console.log(chalk.green('\n📊 MODEL TEST RESULTS 📊\n'));

  // Display results table
  console.log(chalk.cyan('┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐'));
  console.log(chalk.cyan('│ Model                        │ Total │ Success │ Partial │ Failures │ Success Rate │ Avg Time │'));
  console.log(chalk.cyan('├─────────────────────────────────────────────────────────────────────────────────────────────────────┤'));

  for (const stats of modelStats) {
    const modelName = stats.modelType.padEnd(28);
    const total = stats.totalCalls.toString().padStart(5);
    const success = stats.successes.toString().padStart(7);
    const partial = stats.partials.toString().padStart(7);
    const failure = stats.failures.toString().padStart(8);
    const rate = `${stats.successRate.toFixed(1)}%`.padStart(12);
    const avgTime = `${stats.averageTime.toFixed(2)}s`.padStart(8);

    console.log(chalk.white(`│ ${modelName} │ ${total} │ ${success} │ ${partial} │ ${failure} │ ${rate} │ ${avgTime} │`));
  }

  console.log(chalk.cyan('└─────────────────────────────────────────────────────────────────────────────────────────────────────┘'));

  // Summary statistics
  const totalTests = modelStats.reduce((sum, stats) => sum + stats.totalCalls, 0);
  const totalSuccesses = modelStats.reduce((sum, stats) => sum + stats.successes, 0);
  const totalPartials = modelStats.reduce((sum, stats) => sum + stats.partials, 0);
  const totalFailures = modelStats.reduce((sum, stats) => sum + stats.failures, 0);
  const overallSuccessRate = totalTests > 0 ? ((totalSuccesses / totalTests) * 100) : 0;
  const overallAvgTime = modelStats.length > 0 ?
    modelStats.reduce((sum, stats) => sum + stats.averageTime, 0) / modelStats.length : 0;

  console.log(chalk.green('\n📈 OVERALL SUMMARY:'));
  console.log(chalk.white(`   Total Tests: ${totalTests}`));
  console.log(chalk.green(`   Total Successes: ${totalSuccesses}`));
  console.log(chalk.yellow(`   Total Partial Successes: ${totalPartials}`));
  console.log(chalk.red(`   Total Failures: ${totalFailures}`));
  console.log(chalk.cyan(`   Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`));
  console.log(chalk.blue(`   Overall Average Time: ${overallAvgTime.toFixed(2)}s`));

  // Best and worst performers
  if (modelStats.length > 0) {
    const best = modelStats.reduce((prev, current) =>
      current.successRate > prev.successRate ? current : prev
    );
    const worst = modelStats.reduce((prev, current) =>
      current.successRate < prev.successRate ? current : prev
    );

    console.log(chalk.green(`\n🏆 Best Performer: ${best.modelType} (${best.successRate.toFixed(1)}% success rate)`));
    console.log(chalk.red(`❌ Worst Performer: ${worst.modelType} (${worst.successRate.toFixed(1)}% success rate)`));
  }
}

async function main() {
  try {
    const params = await parseArguments();

    console.log(chalk.green('--- LLM Model Consistency Test ---'));
    console.log(chalk.yellow(`Testing cognitive effort classification across models...\n`));

    // Get selected models
    const selectedModels = getSelectedModels(params);
    console.log(chalk.blue(`Selected models: ${selectedModels.join(', ')}`));
    console.log(chalk.blue(`Attempts per model: ${params.attempts}`));
    console.log(chalk.blue(`Save results: ${params.save ? 'Yes' : 'No'}\n`));

    // Configure rate limiter
    const rateLimiterConfig: AsyncRateLimiterConfig = {
      maxConcurrent: 5,
      intervalCap: 20,
      interval: 10000
    };
    const rateLimiter = new AsyncRateLimiter(rateLimiterConfig);

    // Initialize script save service if needed
    const saveService = params.save ? new ScriptSaveService() : null;

    // Create all test requests
    const allRequests: TestRequest[] = [];
    selectedModels.forEach(modelType => {
      for (let i = 0; i < params.attempts; i++) {
        allRequests.push({
          id: allRequests.length + 1,
          modelType
        });
      }
    });

    console.log(chalk.blue(`Total requests to process: ${allRequests.length}`));

    // Process all requests with rate limiting
    console.log(chalk.blue('\n🔄 Processing requests...'));

    const { successful: successfulResults, failed: failedResults } =
      await rateLimiter.processItems<TestRequest, TestResult>(
        allRequests,
        async (request) => {
          console.log(chalk.gray(`Testing ${request.modelType} (attempt ${request.id})...`));
          return await testModelWithPrompt(request.modelType, request.id);
        }
      );

    // Combine results - convert failed results to TestResult format
    const failedResultsConverted: TestResult[] = failedResults.map(f => ({
      requestId: f.item.id,
      modelType: f.item.modelType,
      status: 'failed' as const,
      error: f.error.message,
      executionTime: 0, // Failed requests don't have execution time
      tokenCount: 0
    }));

    const allResults = [...successfulResults, ...failedResultsConverted];

    console.log(chalk.blue('\n✅ Processing complete!'));

    // Calculate statistics per model
    const modelStats: ModelStats[] = selectedModels.map(modelType => {
      const modelResults = allResults.filter(r => r.modelType === modelType);
      const successes = modelResults.filter(r => r.status === 'success').length;
      const partials = modelResults.filter(r => r.status === 'partial').length;
      const failures = modelResults.filter(r => r.status === 'failed').length;
      const totalCalls = modelResults.length;

      const successRate = totalCalls > 0 ? ((successes + partials * 0.5) / totalCalls) * 100 : 0;
      const averageTime = modelResults.length > 0 ?
        modelResults.reduce((sum, r) => sum + r.executionTime, 0) / modelResults.length / 1000 : 0;

      // Calculate average tokens for successful results
      const successfulWithTokens = modelResults.filter(r => r.status === 'success' && r.tokenCount);
      const averageTokens = successfulWithTokens.length > 0 ?
        successfulWithTokens.reduce((sum, r) => sum + (r.tokenCount || 0), 0) / successfulWithTokens.length : 0;

      return {
        modelType,
        totalCalls,
        successes,
        partials,
        failures,
        successRate,
        averageTime,
        averageTokens
      };
    });

    // Save results if requested
    if (params.save && saveService) {
      console.log(chalk.blue('\n💾 Saving results...'));
      const saveResult = saveService.saveJson({
        testParams: params,
        timestamp: new Date().toISOString(),
        modelStats,
        results: allResults
      }, 'testModels-results');

      if (saveResult.success) {
        console.log(chalk.green(`✅ Results saved to: ${saveResult.filePath}`));
      } else {
        console.log(chalk.red(`❌ Failed to save results: ${saveResult.error}`));
      }
    }

    // Generate and display report
    generateReport(modelStats, allResults);

    console.log(chalk.green('\n--- Test completed successfully ---'));

  } catch (error) {
    console.error(chalk.red('❌ Error in model test:'), error);
    process.exit(1);
  }
}

main();
