import axios from 'axios';
import chalk from 'chalk';
import { config } from '../config';

interface ScriptParams {
  // No parameters needed for this script
}

async function parseArguments(): Promise<ScriptParams> {
  // No arguments needed for this script
  return {};
}

async function main() {
  console.log(chalk.green('\n--- OpenRouter API Key Info Script --- \n'));
  
  const params = await parseArguments();

  // Check if API key is available
  if (!config.openRouterApiKey) {
    console.error(chalk.red('Error: OpenRouter API key not found'));
    console.error(chalk.yellow('To set up your environment:'));
    console.error(chalk.cyan('- Create a .env file in the root folder of the project'));
    console.error(chalk.cyan('- Add to the .env file: OPENROUTER_API_KEY=your_api_key_here'));
    process.exit(1);
  }
  else {
    
    console.log(chalk.green('Config: OpenRouter API Key:'), config.openRouterApiKey);
  }

  console.log(chalk.blue('Fetching OpenRouter API key information...'));
    

  try {
    
    const response = await axios.get('https://openrouter.ai/api/v1/key', {
      headers: {
        'Authorization': `Bearer ${config.openRouterApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(chalk.green('--- API Authentication Information ---'));
    if(response.status === 200) {
        console.log(chalk.cyan('OpenRouter successfully configured'));
    }
    console.log(chalk.cyan('See https://openrouter.ai/docs/api-reference/limits for more information'));
    console.log(chalk.cyan('Status Code:'), response.status);
    console.log(chalk.cyan('Response Data:'));

    // Pretty print the JSON response
    console.log(JSON.stringify(response.data, null, 2));

    console.log(chalk.green('--- End of API Authentication Information ---'));

  } catch (error: any) {
    console.error(chalk.red('Error fetching API key information:'));

    if (error.response) {
      // Server responded with error status
      console.error(chalk.red('Status Code:'), error.response.status);
      console.error(chalk.red('Response Data:'), JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Request was made but no response received
      console.error(chalk.red('No response received from server'));
      console.error(chalk.red('Error:'), error.message);
    } else {
      // Something else happened
      console.error(chalk.red('Error:'), error.message);
    }

    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});
