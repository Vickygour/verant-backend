require('dotenv').config();

/**
 * Central place to read process.env.
 * Import this everywhere instead of `process.env.X` directly —
 * if a required variable is missing we fail fast with a clear message
 * instead of a confusing crash later deep inside the app.
 */

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    // Throw instead of process.exit(1): this file is also loaded inside a
    // Vercel serverless function (api/index.js → src/app.js), where killing
    // the whole process on a missing env var can take other in-flight
    // invocations down with it. Throwing surfaces a normal 500 with a clear
    // message instead, and `npm start`/`npm run dev` still crash loudly
    // because nothing catches this at the top level in src/server.js.
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
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  OTP_EXPIRY_MINUTES: Number(process.env.OTP_EXPIRY_MINUTES) || 10,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'VÉRANT Maison <no-reply@verant-maison.in>',

  ADMIN_NAME: process.env.ADMIN_NAME || 'Admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@verant-maison.in',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@12345',

  isProd: (process.env.NODE_ENV || 'development') === 'production',
};

module.exports = env;
