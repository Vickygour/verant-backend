const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const env = require('../config/env');

const OAuth2 = google.auth.OAuth2;

/**
 * Creates a Nodemailer transporter using Gmail OAuth2.
 * Access token is auto-generated from the long-lived refresh token.
 */
async function createTransporter() {
  const oauth2Client = new OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground',
  );

  oauth2Client.setCredentials({
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
  });

  const accessTokenResponse = await oauth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: env.GOOGLE_USER,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      refreshToken: env.GOOGLE_REFRESH_TOKEN,
      accessToken: accessTokenResponse.token,
    },
  });
}

/**
 * Sends an email via Gmail OAuth2.
 * @param {{ to: string, subject: string, html: string, text?: string }} options
 */
async function sendEmail({ to, subject, html, text }) {
  const transporter = await createTransporter();

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