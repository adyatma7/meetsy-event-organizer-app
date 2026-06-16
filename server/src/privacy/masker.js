/**
 * PII Masker — Privacy Layer
 *
 * Strips personally identifiable information before sending data to external AI services.
 * Only job-related fields (jobTitle, industry, city) are passed through.
 * Name, email, phone, and company are stripped.
 *
 * This runs automatically before every AI adapter call in the ETL pipeline.
 * Even when using Ollama (local), masking runs for consistency.
 */

// Fields that are safe to send to AI (not personally identifiable)
const SAFE_FIELDS = ['jobTitle', 'industry', 'city'];

// Fields that contain PII and must be stripped
const PII_FIELDS = ['name', 'email', 'phone', 'company', 'id'];

/**
 * Mask PII from a data object.
 * Returns a new object containing only safe fields.
 *
 * @param {Object} data - Raw participant data
 * @returns {Object} - Data with PII stripped
 */
function mask(data) {
  const masked = {};

  for (const field of SAFE_FIELDS) {
    if (data[field] !== undefined && data[field] !== null) {
      masked[field] = data[field];
    }
  }

  return masked;
}

/**
 * Check if a data object contains any PII fields.
 * Useful for validation — ensure nothing slipped through.
 *
 * @param {Object} data - Data to check
 * @returns {{ hasPII: boolean, fields: string[] }}
 */
function checkForPII(data) {
  const found = [];

  for (const field of PII_FIELDS) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      found.push(field);
    }
  }

  return { hasPII: found.length > 0, fields: found };
}

module.exports = { mask, checkForPII, SAFE_FIELDS, PII_FIELDS };
