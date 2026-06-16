/**
 * Resend Email Adapter (default)
 *
 * Free tier: 3,000 emails/month, 100/day
 * Docs: https://resend.com/docs
 */

const fs = require('fs');
const path = require('path');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TEMPLATES_DIR = path.join(__dirname, '../../../email-templates');

/**
 * Load and render an HTML email template.
 * Replaces {{variableName}} placeholders with data values.
 */
function renderTemplate(templateName, data) {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Email template not found: ${templateName}.html`);
  }

  let html = fs.readFileSync(templatePath, 'utf-8');

  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(placeholder, value || '');
  }

  return html;
}

/**
 * Send an email via Resend API.
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.templateName - Template filename (without .html)
 * @param {Object} params.data - Template variables
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendEmail({ to, templateName, data }) {
  try {
    const html = renderTemplate(templateName, data);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: data.fromEmail || 'Meetsy Events <onboarding@resend.dev>',
        to,
        subject: data.subject || 'Meetsy Event Notification',
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Resend] Send failed:', result);
      return { success: false, error: result.message || 'Send failed' };
    }

    return { success: true, messageId: result.id };
  } catch (err) {
    console.error('[Resend] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail };
