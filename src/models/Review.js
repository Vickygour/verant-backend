const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    author: { type: String, required: true }, // snapshot of user's name at review time
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
    verified: { type: Boolean, default: true }, // verified purchase
    likes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// One review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

/**
 * Recalculates and stores the parent product's average rating + review count.
 * Called after save/remove so Product.rating always stays in sync.
 */
reviewSchema.statics.recalculateProductRating = async function recalculateProductRating(productId) {
  const Product = mongoose.model('Product');
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(stats[0].avgRating * 10) / 10,
      reviews: stats[0].count,
    });
  } else {
    await Product.findByIdAndUpdate(productId, { rating: 0, reviews: 0 });
  }
};

reviewSchema.post('save', function afterSave() {
  this.constructor.recalculateProductRating(this.product);
});

reviewSchema.post('findOneAndDelete', function afterDelete(doc) {
  if (doc) doc.constructor.recalculateProductRating(doc.product);
});

module.exports = mongoose.model('Review', reviewSchema);
