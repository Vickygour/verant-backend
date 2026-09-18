const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

/**
 * Lazily creates a single reusable SMTP transporter.
 * Reads credentials from .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).
 */
function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE, // true for port 465, false for 587
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Sends an email.
 * @param {{ to: string, subject: string, html: string, text?: string }} options
 */
async function sendEmail({ to, subject, html, text }) {
  const mailTransporter = getTransporter();

  const info = await mailTransporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });

  if (env.NODE_ENV !== 'production') {
    console.log(`[mail] Sent → "${subject}" to ${to} (messageId: ${info.messageId})`);
  }

  return info;
}

module.exports = sendEmail;
