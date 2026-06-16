/**
 * Ollama AI Adapter (default — local, free, private)
 *
 * Runs locally via Ollama. No data leaves your machine.
 * Default model: phi3:mini (~2.3GB)
 *
 * Setup: ollama pull phi3:mini
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'phi3:mini';

/**
 * Send a completion request to Ollama.
 * @param {Object} params
 * @param {string} params.systemPrompt - System instruction
 * @param {string} params.userPrompt - User input
 * @returns {Promise<{ text: string, success: boolean, error?: string }>}
 */
async function complete({ systemPrompt, userPrompt }) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temp for deterministic standardization
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Ollama] API error:', errText);
      return { text: '', success: false, error: errText };
    }

    const result = await response.json();
    return { text: result.response, success: true };
  } catch (err) {
    console.error('[Ollama] Error:', err.message);
    return { text: '', success: false, error: err.message };
  }
}

module.exports = { complete };
