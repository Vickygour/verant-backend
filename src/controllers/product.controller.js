const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * GET /api/products
 * Mirrors the frontend's `filterProducts()` logic (src/lib/filterProducts.js)
 * as query params, so the Next.js men/new/bestseller pages can be swapped
 * from the static PRODUCTS array to this endpoint with minimal changes.
 *
 * Query params:
 *  cats        comma separated categories, e.g. "Sneakers,Hoodies"
 *  maxPrice    number
 *  sizes       comma separated sizes
 *  colors      comma separated color names
 *  materials   comma separated material keywords
 *  avail       "all" | "in" | "low"
 *  query       free text search (name, category, material)
 *  sort        "featured" | "low" | "high" | "rating" | "new"
 *  page, limit pagination (defaults 1 / 24)
 */
const getProducts = asyncHandler(async (req, res) => {
  const {
    cats,
    maxPrice,
    sizes,
    colors,
    materials,
    avail = 'all',
    query,
    sort = 'featured',
    page = 1,
    limit = 24,
  } = req.query;

  const filter = { isActive: true };

  if (cats) filter.cat = { $in: cats.split(',').map((c) => c.trim()) };

  if (maxPrice) filter.price = { $lte: Number(maxPrice) };

  if (sizes) filter.sizes = { $in: sizes.split(',').map((s) => s.trim()) };

  if (colors) {
    const wanted = colors.split(',').map((c) => c.trim().toLowerCase());
    filter['colors.n'] = {
      $regex: wanted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
      $options: 'i',
    };
  }

  if (materials) {
    const wanted = materials.split(',').map((m) => m.trim());
    filter.material = {
      $regex: wanted.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
      $options: 'i',
    };
  }

  if (avail === 'in') filter.stock = { $gt: 0 };
  if (avail === 'low') filter.stock = { $gt: 0, $lt: 10 };

  if (query) {
    filter.$text = { $search: query };
  }

  let sortSpec = {}; // "featured" = natural/insertion order
  if (sort === 'low') sortSpec = { price: 1 };
  if (sort === 'high') sortSpec = { price: -1 };
  if (sort === 'rating') sortSpec = { rating: -1 };
  if (sort === 'new') sortSpec = { isNewArrival: -1, createdAt: -1 };

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sortSpec).skip(skip).limit(limitNum),
    Product.countDocuments(filter),
  ]);

  return new ApiResponse(200, 'Products fetched', {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1,
    },
  }).send(res);
});

/** GET /api/products/:id — accepts either the legacy numeric id or a Mongo _id */
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isNumeric = /^\d+$/.test(id);
  const isObjectId = /^[a-f\d]{24}$/i.test(id);

  const product = await Product.findOne(
    isNumeric ? { id: Number(id) } : isObjectId ? { _id: id } : { slug: id },
  );

  if (!product) throw new ApiError(404, 'Product not found');
  return new ApiResponse(200, 'Product fetched', { product }).send(res);
});

/** GET /api/products/featured — bestsellers + new arrivals, for the homepage rails */
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const items = await Product.find({ isActive: true, $or: [{ isBest: true }, { isNewArrival: true }] })
    .sort({ isBest: -1 })
    .limit(12);
  return new ApiResponse(200, 'Featured products fetched', { items }).send(res);
});

/** GET /api/products/search?q=... — free text search used by the search overlay */
const searchProducts = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();

  if (!q) {
    const items = await Product.find({ isActive: true, isBest: true }).limit(4);
    return new ApiResponse(200, 'Default suggestions', { items }).send(res);
  }

  const items = await Product.find({
    isActive: true,
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { cat: { $regex: q, $options: 'i' } },
      { material: { $regex: q, $options: 'i' } },
      { tagline: { $regex: q, $options: 'i' } },
    ],
  }).limit(20);

  return new ApiResponse(200, 'Search results', { items }).send(res);
});

/** GET /api/products/categories — category list + tile images for nav/grids */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct('cat', { isActive: true });
  return new ApiResponse(200, 'Categories fetched', { categories }).send(res);
});

// --- Admin-only CRUD (protect + authorize('admin') applied at route level) ---

const createProduct = asyncHandler(async (req, res) => {
  const lastProduct = await Product.findOne().sort({ id: -1 });
  const nextId = lastProduct ? lastProduct.id + 1 : 1;

  const product = await Product.create({ ...req.body, id: req.body.id || nextId });
  return new ApiResponse(201, 'Product created', { product }).send(res);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) throw new ApiError(404, 'Product not found');
  return new ApiResponse(200, 'Product updated', { product }).send(res);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  return new ApiResponse(200, 'Product deleted').send(res);
});

module.exports = {
  getProducts,
  getProductById,
  getFeaturedProducts,
  searchProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
};
