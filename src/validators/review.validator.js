const { body } = require('express-validator');

const createReviewValidator = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').trim().notEmpty().withMessage('Review title is required').isLength({ max: 120 }),
  body('comment').trim().notEmpty().withMessage('Review comment is required').isLength({ max: 2000 }),
];

module.exports = { createReviewValidator };
