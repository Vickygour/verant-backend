const crypto = require('crypto');

/**
 * Generates a numeric 6-digit OTP as a string, e.g. "042917".
 * Uses crypto.randomInt so it's cryptographically sound, not Math.random().
 */
function generateOtp(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(crypto.randomInt(min, max + 1));
}

module.exports = generateOtp;
