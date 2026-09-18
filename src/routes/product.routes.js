const express = require('express');
const ctrl = require('../controllers/product.controller');
const reviewCtrl = require('../controllers/review.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createReviewValidator } = require('../validators/review.validator');

const router = express.Router();

// --- Public catalogue ---
router.get('/', ctrl.getProducts);
router.get('/featured', ctrl.getFeaturedProducts);
router.get('/search', ctrl.searchProducts);
router.get('/categories', ctrl.getCategories);
router.get('/:id', ctrl.getProductById);

// --- Nested reviews ---
router.get('/:productId/reviews', reviewCtrl.getProductReviews);
router.post(
  '/:productId/reviews',
  protect,
  createReviewValidator,
  validate,
  reviewCtrl.createReview,
);

// --- Admin-only catalogue management ---
router.post('/', protect, authorize('admin'), ctrl.createProduct);
router.patch('/:id', protect, authorize('admin'), ctrl.updateProduct);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteProduct);

module.exports = router;
