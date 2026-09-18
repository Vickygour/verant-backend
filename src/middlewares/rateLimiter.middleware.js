const rateLimit = require('express-rate-limit');

/**
 * General API limiter — protects the whole backend from abuse/scraping.
 * 300 requests / 15 min per IP is generous for normal browsing + checkout.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again in a few minutes.',
  },
});

/**
 * Strict limiter for LOGIN specifically — this is the one the user asked
 * about explicitly. Blocks brute-force password guessing.
 * 5 attempts per 10 minutes per IP.
 */
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only counts failed login attempts
  message: {
    success: false,
    message: 'Too many login attempts. Please wait 10 minutes before trying again.',
  },
});

/**
 * Limiter for OTP-sending endpoints (signup, resend-otp, forgot-password).
 * Prevents someone from spamming a stranger's inbox / SMS gateway costs.
 * 5 OTP emails per 15 minutes per IP.
 */
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification code requests. Please wait a while and try again.',
  },
});

/**
 * Limiter for creating orders — stops checkout spam / inventory-lock abuse.
 * 20 orders per hour per IP is far above any real customer's need.
 */
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many orders placed from this IP. Please try again later.',
  },
});

module.exports = { apiLimiter, loginLimiter, otpLimiter, orderLimiter };
