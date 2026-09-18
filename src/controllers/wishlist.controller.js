const User = require('../models/User');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/** GET /api/wishlist — populated with full product docs */
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist');
  return new ApiResponse(200, 'Wishlist fetched', { wishlist: user.wishlist }).send(res);
});

/** POST /api/wishlist/:productId — toggle add/remove, mirrors StoreContext.toggleWishlist */
const toggleWishlist = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ id: req.params.productId });
  if (!product) throw new ApiError(404, 'Product not found');

  const user = await User.findById(req.user._id);
  const idx = user.wishlist.findIndex((p) => p.toString() === product._id.toString());

  let added;
  if (idx > -1) {
    user.wishlist.splice(idx, 1);
    added = false;
  } else {
    user.wishlist.push(product._id);
    added = true;
  }

  await user.save();

  return new ApiResponse(200, added ? 'Saved to your wishlist.' : 'Removed from wishlist.', {
    added,
    wishlist: user.wishlist,
  }).send(res);
});

module.exports = { getWishlist, toggleWishlist };
