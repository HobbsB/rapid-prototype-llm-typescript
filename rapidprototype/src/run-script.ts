/**
 * Script runner utility that dynamically finds and executes scripts from the scripts directory
 * 
 * This script is executed by ts-node and it, in turn, requires the target script.
 * This avoids nested child processes and issues with argument parsing or finding binaries on Windows.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPTS_DIR = path.join(__dirname, 'scripts');

async function main() {
  const scriptName = process.argv[2];
  
  if (!scriptName) {
    console.error('Error: Script name is required');
    console.log('Usage: yarn script <scriptName> [args...]');
    printAvailableScripts();
    process.exit(1);
  }
  
  const scriptPath = path.join(SCRIPTS_DIR, `${scriptName}.ts`);
  
  // Check if script exists
  if (!fs.existsSync(scriptPath)) {
    console.error(`Error: Script "${scriptName}.ts" not found at ${scriptPath}`);
    printAvailableScripts();
    process.exit(1);
  }
  
  // The first two args are the node executable and this script's path.
  // The third is the script name. The rest are the arguments for the target script.
  // We need to keep the first two so the target script's argv is what it expects.
  process.argv.splice(2, 1);
  
  console.log(`Running script: ${scriptName}`);
  console.log(`Script path: ${scriptPath}`);

  // Convert Windows path to file:// URL for ESM compatibility
  const scriptUrl = path.isAbsolute(scriptPath)
    ? `file://${scriptPath.replace(/\\/g, '/')}`
    : scriptPath;

  // Execute the script using dynamic import for ESM compatibility.
  // This runs it in the same process, avoiding all spawn/shell issues.
  await import(scriptUrl);
}

function printAvailableScripts() {
  try {
    // List available scripts
    const availableScripts = fs.readdirSync(SCRIPTS_DIR)
      .filter(file => file.endsWith('.ts'))
      .map(file => file.replace('.ts', ''));
    
    if (availableScripts.length > 0) {
      console.log('\nAvailable scripts:');
      availableScripts.forEach(script => console.log(`- ${script}`));
    } else {
      console.log('\nNo scripts found in directory:', SCRIPTS_DIR);
    }
  } catch (error) {
    console.error('Error reading scripts directory:', error);
  }
}

main().catch(error => {
  console.error('Error running script:', error);
  process.exit(1);
}); 