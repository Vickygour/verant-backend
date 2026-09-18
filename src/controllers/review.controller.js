const Review = require('../models/Review');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/** GET /api/products/:productId/reviews */
const getProductReviews = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ id: req.params.productId }).select('_id');
  if (!product) throw new ApiError(404, 'Product not found');

  const reviews = await Review.find({ product: product._id }).sort({ createdAt: -1 });
  return new ApiResponse(200, 'Reviews fetched', { reviews }).send(res);
});

/**
 * POST /api/products/:productId/reviews
 * One review per user per product (enforced by the unique compound index).
 */
const createReview = asyncHandler(async (req, res) => {
  const { rating, title, comment } = req.body;

  const product = await Product.findOne({ id: req.params.productId });
  if (!product) throw new ApiError(404, 'Product not found');

  const existing = await Review.findOne({ product: product._id, user: req.user._id });
  if (existing) {
    throw new ApiError(409, 'You have already reviewed this product.');
  }

  const review = await Review.create({
    product: product._id,
    user: req.user._id,
    author: req.user.name,
    rating,
    title,
    comment,
    verified: true,
  });

  return new ApiResponse(201, 'Review submitted', { review }).send(res);
});

/** DELETE /api/reviews/:id — owner or admin */
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');

  const isOwner = review.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'You cannot delete this review.');
  }

  await Review.findOneAndDelete({ _id: review._id });
  return new ApiResponse(200, 'Review deleted').send(res);
});

/** PATCH /api/reviews/:id/like — simple "helpful" counter, no auth requirement */
const likeReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $inc: { likes: 1 } },
    { new: true },
  );
  if (!review) throw new ApiError(404, 'Review not found');
  return new ApiResponse(200, 'Review liked', { review }).send(res);
});

module.exports = { getProductReviews, createReview, deleteReview, likeReview };
