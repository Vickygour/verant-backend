/**
 * Standard application error. Throw this anywhere in a controller/service
 * and the global error middleware will turn it into a clean JSON response.
 *
 * Usage: throw new ApiError(404, 'Product not found');
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors; // e.g. field-level validation errors
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
