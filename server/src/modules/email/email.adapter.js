const nodemailer = require('nodemailer');

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Nodemailer transport setup
let transporter = null;
if (process.env.EMAIL_PROVIDER === 'smtp') {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends an email using Nodemailer (SMTP)
 */
async function sendEmailViaNodemailer(to, subject, html) {
  if (!transporter) {
    console.warn('SMTP transporter not configured, falling back to mock');
    return { success: true, mock: true };
  }
  
  const from = process.env.SMTP_FROM || 'Meetsy Events <noreply@Meetsy.com>';
  
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });

  return { success: true, id: info.messageId };
}

/**
 * Sends an email using the Resend REST API
 */
async function sendEmailViaResend(to, subject, html) {
  if (!RESEND_API_KEY || RESEND_API_KEY === 're_xxxxxxxxxxxx') {
    console.log('--- MOCK EMAIL SENT ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML length: ${html.length} chars`);
    return { success: true, mock: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Meetsy Events <noreply@Meetsy.com>', // Usually needs to be a verified domain in Resend
      to,
      subject,
      html
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Email sending failed: ${data.message || JSON.stringify(data)}`);
  }

  return { success: true, id: data.id };
}

/**
 * Helper to replace {{variables}} in templates
 */
function renderTemplate(htmlTemplate, variables) {
  let rendered = htmlTemplate;
  for (const [key, value] of Object.entries(variables)) {
    // Replace all occurrences of {{key}}
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, value);
  }
  return rendered;
}

/**
 * Generate the HTML template for the invite email
 */
function getInviteTemplate(participant, event, qrToken, customTemplate) {
  const qrUrl = `https://quickchart.io/qr?text=${qrToken}&size=300&margin=2`;
  const eventDate = new Date(event.date).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const variables = {
    name: participant.name,
    event_title: event.title,
    event_date: eventDate,
    event_time: `${event.timeStart} - ${event.timeEnd}`,
    event_venue: event.venue,
    event_city: event.city,
    qr_code: `<img src="${qrUrl}" alt="Your Entry QR Code" style="width: 250px; height: 250px; border: 4px solid #fff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-radius: 12px;"/>`
  };

  if (customTemplate && customTemplate.html) {
    return renderTemplate(customTemplate.html, variables);
  }

  return `
    <div style="font-family: Arial, sans-serif; max-w-xl mx-auto p-6 bg-white border border-gray-200 rounded-xl">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0;">${event.title}</h1>
        <p style="color: #6b7280; font-size: 16px;">You are invited!</p>
      </div>

      <p style="font-size: 16px; color: #111827;">Hi ${participant.name},</p>
      
      <p style="font-size: 16px; color: #374151; line-height: 1.5;">
        Your registration for <strong>${event.title}</strong> has been approved. 
        Please find your entry QR code below. Present this code at the registration desk upon arrival.
      </p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;"><strong>Date:</strong> ${eventDate}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;"><strong>Time:</strong> ${event.timeStart} - ${event.timeEnd}</p>
        <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Venue:</strong> ${event.venue}, ${event.city}</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        ${variables.qr_code}
        <p style="font-size: 12px; color: #6b7280; margin-top: 12px;">Do not share this QR code. It is unique to you.</p>
      </div>

      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
      
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        Powered by Meetsy Events<br/>
        If you have any questions, please reply to this email.
      </p>
    </div>
  `;
}

function getRejectionTemplate(participant, event, customTemplate) {
  const variables = {
    name: participant.name,
    event_title: event.title,
  };

  if (customTemplate && customTemplate.html) {
    return renderTemplate(customTemplate.html, variables);
  }

  return `
    <div style="font-family: Arial, sans-serif; max-w-xl mx-auto p-6 bg-white border border-gray-200 rounded-xl">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0;">${event.title}</h1>
      </div>
      <p style="font-size: 16px; color: #111827;">Hi ${participant.name},</p>
      <p style="font-size: 16px; color: #374151; line-height: 1.5;">
        Thank you for your interest in <strong>${event.title}</strong>. Unfortunately, due to overwhelming demand, we cannot accommodate your registration at this time.
      </p>
      <p style="font-size: 16px; color: #374151; line-height: 1.5;">
        We hope to see you at a future event!
      </p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">Powered by Meetsy Events</p>
    </div>
  `;
}

function getInviteTemplateOnly(participant, event, customTemplate) {
  const registration_link = `${process.env.PUBLIC_URL || 'http://localhost:5173'}/register/${event.slug}`;
  const variables = {
    name: participant.name,
    event_title: event.title,
    registration_link: `<a href="${registration_link}" style="background-color: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Register Now</a>`
  };

  if (customTemplate && customTemplate.html) {
    return renderTemplate(customTemplate.html, variables);
  }

  return `
    <div style="font-family: Arial, sans-serif; max-w-xl mx-auto p-6 bg-white border border-gray-200 rounded-xl">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0;">${event.title}</h1>
      </div>
      <p style="font-size: 16px; color: #111827;">Hi ${participant.name},</p>
      <p style="font-size: 16px; color: #374151; line-height: 1.5;">
        You have been exclusively invited to register for <strong>${event.title}</strong>!
      </p>
      <p style="font-size: 16px; color: #374151; line-height: 1.5;">
        Please complete your registration form by clicking the link below:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        ${variables.registration_link}
      </div>
    </div>
  `;
}

function getPendingTemplate(participant, event, customTemplate) {
  const variables = {
    name: participant.name,
    event_title: event.title,
  };

  if (customTemplate && customTemplate.html) {
    return renderTemplate(customTemplate.html, variables);
  }

  return `
    <div style="font-family: Arial, sans-serif; max-w-xl mx-auto p-6 bg-white border border-gray-200 rounded-xl">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0;">${event.title}</h1>
      </div>
      <p style="font-size: 16px; color: #111827;">Hi ${participant.name},</p>
      <p style="font-size: 16px; color: #374151; line-height: 1.5;">
        Thank you for submitting your registration form for <strong>${event.title}</strong>.
      </p>
      <p style="font-size: 16px; color: #374151; line-height: 1.5;">
        Your application is currently under review by our team. We will notify you via email once your status is updated.
      </p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">Powered by Meetsy Events</p>
    </div>
  `;
}

/**
 * Main adapter functions
 */
async function sendApprovalEmail(participant, event, qrToken) {
  const provider = process.env.EMAIL_PROVIDER || 'resend';
  
  let subject = `Your Registration is Approved: ${event.title}`;
  if (event.approvalEmailTemplate && event.approvalEmailTemplate.subject) {
    subject = renderTemplate(event.approvalEmailTemplate.subject, { name: participant.name, event_title: event.title });
  }

  const html = getInviteTemplate(participant, event, qrToken, event.approvalEmailTemplate);

  if (provider === 'smtp') {
    return sendEmailViaNodemailer(participant.email, subject, html);
  } else if (provider === 'resend') {
    return sendEmailViaResend(participant.email, subject, html);
  } else {
    console.log('--- MOCK EMAIL SENT ---');
    console.log(`To: ${participant.email}`);
    console.log(`Subject: ${subject}`);
    return { success: true, mock: true };
  }
}

async function sendRejectionEmail(participant, event) {
  const provider = process.env.EMAIL_PROVIDER || 'resend';
  
  let subject = `Update regarding your registration: ${event.title}`;
  if (event.rejectionEmailTemplate && event.rejectionEmailTemplate.subject) {
    subject = renderTemplate(event.rejectionEmailTemplate.subject, { name: participant.name, event_title: event.title });
  }

  const html = getRejectionTemplate(participant, event, event.rejectionEmailTemplate);

  if (provider === 'smtp') {
    return sendEmailViaNodemailer(participant.email, subject, html);
  } else if (provider === 'resend') {
    return sendEmailViaResend(participant.email, subject, html);
  } else {
    console.log('--- MOCK EMAIL SENT ---');
    console.log(`To: ${participant.email}`);
    console.log(`Subject: ${subject}`);
    return { success: true, mock: true };
  }
}

async function sendInviteEmail(participant, event) {
  const provider = process.env.EMAIL_PROVIDER || 'resend';
  
  let subject = `You are invited to ${event.title}!`;
  if (event.inviteEmailTemplate && event.inviteEmailTemplate.subject) {
    subject = renderTemplate(event.inviteEmailTemplate.subject, { name: participant.name, event_title: event.title });
  }

  const html = getInviteTemplateOnly(participant, event, event.inviteEmailTemplate);

  if (provider === 'smtp') {
    return sendEmailViaNodemailer(participant.email, subject, html);
  } else if (provider === 'resend') {
    return sendEmailViaResend(participant.email, subject, html);
  } else {
    console.log('--- MOCK EMAIL SENT ---');
    console.log(`To: ${participant.email}`);
    console.log(`Subject: ${subject}`);
    return { success: true, mock: true };
  }
}

async function sendPendingEmail(participant, event) {
  const provider = process.env.EMAIL_PROVIDER || 'resend';
  
  let subject = `Registration Received: ${event.title}`;
  if (event.pendingEmailTemplate && event.pendingEmailTemplate.subject) {
    subject = renderTemplate(event.pendingEmailTemplate.subject, { name: participant.name, event_title: event.title });
  }

  const html = getPendingTemplate(participant, event, event.pendingEmailTemplate);

  if (provider === 'smtp') {
    return sendEmailViaNodemailer(participant.email, subject, html);
  } else if (provider === 'resend') {
    return sendEmailViaResend(participant.email, subject, html);
  } else {
    console.log('--- MOCK EMAIL SENT ---');
    console.log(`To: ${participant.email}`);
    console.log(`Subject: ${subject}`);
    return { success: true, mock: true };
  }
}

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail,
  sendInviteEmail,
  sendPendingEmail
};
