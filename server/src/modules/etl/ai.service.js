// Native fetch is available in Node 18+

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'phi4-mini';

const SCHEMA_FIELDS = ['name', 'email', 'phone', 'company', 'jobTitle', 'industry', 'city'];

/**
 * PHASE 0: One-shot AI call per batch.
 * Sends only the CSV column headers to phi4-mini and asks it to map each
 * header to a known schema field or mark it as "custom" (JSONB survey answer).
 * This is cheap — it runs once per import, not once per row.
 *
 * Returns a mapping object like:
 * {
 *   "Full Name Pls":       "name",
 *   "Email Address!!":     "email",
 *   "Phone Number (opt)":  "phone",
 *   "Where do you work":   "company",
 *   "Job Role":            "jobTitle",
 *   "Industry Sector":     "industry",
 *   "City Location":       "city",
 *   "T-Shirt Size":        "custom",
 *   "Any dietary needs":   "custom",
 *   "Event Name":          "custom"   ← event col stays raw, handled separately
 * }
 */
async function mapColumns(columnHeaders) {
  const prompt = `
You are a data schema mapping assistant for an event management system.

I have a CSV file with these column headers:
${JSON.stringify(columnHeaders)}

Our database schema has these participant fields:
- name        (person's full name)
- email       (email address)
- phone       (phone/mobile number)
- company     (employer / organization / where they work)
- jobTitle    (job role, position, occupation, designation)
- industry    (industry sector, field, domain)
- city        (city, location, region)

Task: Map each column header to one of the schema fields above.
If a column explicitly represents the Target Event the participant is registering for (e.g. "Event Name", "What Event", "Acara"), map it to "eventName".
If a column does NOT match any schema field (e.g. T-Shirt Size, dietary needs, timestamps, source), map it to "custom".

Rules:
1. Return ONLY a valid JSON object. No markdown, no backticks, no explanation.
2. Every column header from the input must appear as a key in the output.
3. Values must be exactly one of: "name", "email", "phone", "company", "jobTitle", "industry", "city", "eventName", "custom"
4. When in doubt, use "custom".

Example output:
{
  "Full Name": "name",
  "Email Address!!": "email",
  "What Event Are You Joining?": "eventName",
  "T-Shirt Size": "custom"
}
`;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);

    const data = await response.json();
    const resultText = data.response.trim();

    try {
      const parsed = JSON.parse(resultText);

      // Validate: ensure all values are valid schema fields or "custom"
      const valid = ['name', 'email', 'phone', 'company', 'jobTitle', 'industry', 'city', 'eventName', 'custom'];
      const cleaned = {};
      for (const [col, mapped] of Object.entries(parsed)) {
        cleaned[col] = valid.includes(mapped) ? mapped : 'custom';
      }

      // Ensure every input header is in the output (AI might have dropped some)
      for (const h of columnHeaders) {
        if (!(h in cleaned)) cleaned[h] = 'custom';
      }

      return cleaned;
    } catch (e) {
      console.warn('Column mapper returned invalid JSON, falling back to hardcoded aliases');
      return null; // Signal to fall back to hardcoded normalizeColumns
    }
  } catch (error) {
    console.error('Column mapper AI error:', error.message);
    return null; // Graceful fallback
  }
}

/**
 * PHASE 0.5: Standardize a batch of unique event names using AI.
 * It merges typos but keeps explicitly distinct names (like different years) separate.
 * Returns { "Raw Name": "Standardized Name" }
 */
async function standardizeEventNames(rawNamesArray) {
  if (!rawNamesArray || rawNamesArray.length === 0) return {};
  
  const { capitalizeWords } = require('./cleaner');
  
  // 1. Pre-standardize casing so the AI doesn't get confused by case differences
  const uniqueCapitalized = new Set();
  for (const raw of rawNamesArray) {
    uniqueCapitalized.add(capitalizeWords(raw));
  }
  const inputList = Array.from(uniqueCapitalized);

  const prompt = `
You are a data standardization assistant.
I have a list of event names extracted from a spreadsheet.
Your job is to cluster them into canonical event names, fixing any typos or abbreviations.

For example, "Tech Conference 2026", "Tech Conf 2026", and "Tehc Conf" should all map to "Tech Conference 2026".
However, if an event name has a specific year (e.g., "Tech Conf" vs "Tech Conf 2026"), keep them as separate distinct events!

Input Event Names:
${JSON.stringify(inputList)}

Rules:
1. Return ONLY a valid JSON object where keys are the EXACT event names from the input list, and values are the canonical standardized names.
2. Every input name MUST be a key in the output.
3. No markdown formatting, just the raw JSON string.

Example output:
{
  "Tech Conf 2026": "Tech Conference 2026",
  "Tehc Conf": "Tech Conference 2026",
  "Tech Conference 2026": "Tech Conference 2026",
  "Gala Dinner": "Gala Dinner",
  "Tech Conf": "Tech Conference"
}
`;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);

    const data = await response.json();
    const parsed = JSON.parse(data.response.trim());
    
    // 2. Map original raw names back to the AI's canonical names
    // Apply capitalizeWords on the final output to guarantee title casing.
    const cleaned = {};
    for (const raw of rawNamesArray) {
      const cap = capitalizeWords(raw);
      let aiResult = parsed[cap];
      if (!aiResult) aiResult = cap; // fallback if AI dropped it
      
      // Some AI models might output "ai dev workshop", so we force title case here
      // but we do a special check to keep exact acronyms if possible, or just rely on capitalizeWords
      cleaned[raw] = capitalizeWords(aiResult);
    }
    return cleaned;
  } catch (error) {
    console.error('Event standardization AI error:', error.message);
    const fallback = {};
    rawNamesArray.forEach(r => fallback[r] = r);
    return fallback;
  }
}

/**
 * Apply an AI column mapping to a single row.
 * Schema-mapped fields get renamed; "custom" fields keep their original key.
 */
function applyColumnMapping(mapping, row) {
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const target = mapping[key];
    if (target && target !== 'custom') {
      // Map to standard schema field — don't overwrite if already populated
      if (result[target] === undefined || result[target] === '') {
        result[target] = value;
      }
    } else {
      // Keep original key for custom/JSONB fields
      result[key] = value;
    }
  }
  return result;
}

/**
 * PHASE 6 (per-row): Sends a participant record to phi4-mini for ETL enrichment.
 * Only called for rows that already passed all hardcoded checks AND have missing optional fields.
 * Only fills in the specific missing fields — does NOT re-validate already-present data.
 */
async function standardizeData(rawData) {
  // Only ask AI to infer the fields that are actually missing
  const missingFields = ['company', 'industry', 'jobTitle', 'city'].filter(f => !rawData[f]);

  const prompt = `
You are a data enrichment assistant for an event management system.

A participant record has been partially filled. Based on any available context (name, email domain, company, job title, etc.), 
infer ONLY the following missing fields: ${missingFields.join(', ')}.

Participant Data:
${JSON.stringify(rawData)}

Rules:
1. Return ONLY a JSON object containing the missing fields listed above and nothing else.
2. Use proper Title Case.
3. If you cannot confidently infer a field, use an empty string "" for it.
4. Do NOT re-validate or modify any fields that already have values.
5. Do NOT include any markdown, backticks, or explanation. ONLY return valid JSON.

Example — if asked to infer "company" and "city":
{
  "company": "Inferred Company Name",
  "city": "Inferred City"
}
`;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.response.trim();
    
    try {
      const parsed = JSON.parse(resultText);
      return parsed;
    } catch (e) {
      return { flagged: true, reason: 'AI returned invalid JSON' };
    }

  } catch (error) {
    console.error('AI Service Error:', error);
    return { flagged: true, reason: 'AI service unavailable or timed out' };
  }
}

module.exports = {
  mapColumns,
  applyColumnMapping,
  standardizeData,
  standardizeEventNames
};
