import { config } from '../config/index.js';

export function validateEnv() {
  if (!config.gemini.apiKey) {
    throw new Error('❌ GEMINI_API_KEY is missing in .env');
  }
}
