const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Signs a JWT carrying only the user id + role.
 * Keep the payload tiny — never put passwords/PII inside a JWT.
 */
function generateToken(userId, role = 'user') {
  return jwt.sign({ id: userId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

module.exports = generateToken;
