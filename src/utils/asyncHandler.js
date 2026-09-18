/**
 * Wraps an async route/controller so any thrown error (or rejected promise)
 * is automatically forwarded to next(err) → our error middleware.
 * Saves writing try/catch in every single controller function.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
