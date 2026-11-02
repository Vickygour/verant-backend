const nodemailer = require('nodemailer');
const env = require('../config/env');

/**
 * Creates a Nodemailer transporter using Gmail App Password.
 */
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.GOOGLE_USER,
      pass: env.SMTP_PASS, // 16-digit App Password
    },
  });
}

/**
 * Sends an email via Gmail.
 */
async function sendEmail({ to, subject, html, text }) {
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: env.SMTP_FROM || `"Voltra" <${env.GOOGLE_USER}>`,
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