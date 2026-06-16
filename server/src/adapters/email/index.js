/**
 * Email Adapter Interface
 *
 * Reads EMAIL_PROVIDER from .env and returns the matching adapter.
 * Every adapter exports: sendEmail({ to, templateName, data }) → Promise<{ success, messageId }>
 *
 * Swap provider by changing one line in .env — no code changes needed.
 */

const provider = process.env.EMAIL_PROVIDER || 'resend';

const adapters = {
  resend: () => require('./resend'),
  brevo: () => require('./brevo'),
  smtp: () => require('./smtp'),
};

if (!adapters[provider]) {
  throw new Error(
    `Unknown EMAIL_PROVIDER: "${provider}". Valid options: ${Object.keys(adapters).join(', ')}`
  );
}

module.exports = adapters[provider]();
