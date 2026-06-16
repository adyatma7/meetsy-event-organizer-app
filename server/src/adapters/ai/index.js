/**
 * AI Adapter Interface
 *
 * Reads AI_PROVIDER from .env and returns the matching adapter.
 * Every adapter exports: complete({ systemPrompt, userPrompt }) → Promise<{ text, success }>
 *
 * Swap provider by changing one line in .env — no code changes needed.
 */

const provider = process.env.AI_PROVIDER || 'ollama';

const adapters = {
  ollama: () => require('./ollama'),
  gemini: () => require('./gemini'),
};

if (!adapters[provider]) {
  throw new Error(
    `Unknown AI_PROVIDER: "${provider}". Valid options: ${Object.keys(adapters).join(', ')}`
  );
}

module.exports = adapters[provider]();
