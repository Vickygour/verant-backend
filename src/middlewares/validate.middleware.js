const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Run after an array of express-validator checks in a route:
 *   router.post('/login', loginValidator, validate, ctrl.login)
 * Collects all validation errors into one clean 400 response.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const formatted = errors.array().map((e) => ({ field: e.path, message: e.msg }));
  throw new ApiError(400, 'Validation failed', formatted);
}

module.exports = validate;
