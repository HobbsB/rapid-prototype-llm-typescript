import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Directory configurations
export const PROJECT_ROOT = path.resolve(__dirname, '../../');
export const DATA_DIRECTORY = path.join(PROJECT_ROOT, 'output');


export const config = {
  openRouterApiKey: process.env.OPENROUTER_API_KEY || ''
}; 