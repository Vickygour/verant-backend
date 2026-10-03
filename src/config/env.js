require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: Number(process.env.PORT) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000/',

  MONGO_URI: required('MONGO_URI'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  OTP_EXPIRY_MINUTES: Number(process.env.OTP_EXPIRY_MINUTES) || 10,

  // --- Gmail OAuth2 (Nodemailer) ---
  GOOGLE_USER: required('GOOGLE_USER'),
  GOOGLE_CLIENT_ID: required('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: required('GOOGLE_CLIENT_SECRET'),
  GOOGLE_REFRESH_TOKEN: required('GOOGLE_REFRESH_TOKEN'),

  SMTP_FROM: process.env.SMTP_FROM || `"Voltra" <${process.env.GOOGLE_USER}>`,
  EMAIL_FROM: process.env.SMTP_FROM || 'VÉRANT Maison <no-reply@verant-maison.in>',

  ADMIN_NAME: process.env.ADMIN_NAME || 'Admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@verant-maison.in',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@12345',

  isProd: (process.env.NODE_ENV || 'development') === 'production',
};

module.exports = env;