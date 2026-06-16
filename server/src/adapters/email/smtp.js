/**
 * SMTP Email Adapter (Gmail or any SMTP server)
 *
 * Uses Nodemailer under the hood.
 * Gmail: ~500 emails/day with App Password
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '../../../email-templates');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

    const info = await transporter.sendMail({
      from: data.fromEmail || `"Meetsy Events" <${process.env.SMTP_USER}>`,
      to,
      subject: data.subject || 'Meetsy Event Notification',
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[SMTP] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail };
