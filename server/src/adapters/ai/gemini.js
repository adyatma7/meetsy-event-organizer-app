/**
 * Gemini AI Adapter (cloud fallback — free tier)
 *
 * Free tier: 1,500 requests/day, 1M tokens/minute
 * Model: gemini-1.5-flash
 *
 * IMPORTANT: PII masking MUST run before calling this adapter.
 * Data leaves your machine when using this provider.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash';

/**
 * Send a completion request to Google Gemini.
 * @param {Object} params
 * @param {string} params.systemPrompt - System instruction
 * @param {string} params.userPrompt - User input
 * @returns {Promise<{ text: string, success: boolean, error?: string }>}
 */
async function complete({ systemPrompt, userPrompt }) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [{
          parts: [{ text: userPrompt }],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Gemini] API error:', errText);
      return { text: '', success: false, error: errText };
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return { text, success: true };
  } catch (err) {
    console.error('[Gemini] Error:', err.message);
    return { text: '', success: false, error: err.message };
  }
}

module.exports = { complete };
