/**
 * Brevo Email Adapter (formerly Sendinblue)
 *
 * Free tier: 9,000 emails/month, 300/day
 * Docs: https://developers.brevo.com
 */

const fs = require('fs');
const path = require('path');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const TEMPLATES_DIR = path.join(__dirname, '../../../email-templates');

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

async function sendEmail({ to, templateName, data }) {
  try {
    const html = renderTemplate(templateName, data);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Meetsy Events', email: data.fromEmail || 'noreply@Meetsy.com' },
        to: [{ email: to }],
        subject: data.subject || 'Meetsy Event Notification',
        htmlContent: html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Brevo] Send failed:', result);
      return { success: false, error: result.message || 'Send failed' };
    }

    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('[Brevo] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail };
