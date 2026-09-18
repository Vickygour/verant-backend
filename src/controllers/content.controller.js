const Content = require('../models/Content');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const ALLOWED_KEYS = [
  'looks',
  'craft',
  'testimonials',
  'categoryTiles',
  'sizeOptions',
  'colorOptions',
  'materialOptions',
];

/** GET /api/content/:key — e.g. /api/content/looks, /api/content/testimonials */
const getContent = asyncHandler(async (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_KEYS.includes(key)) throw new ApiError(404, `Unknown content key: ${key}`);

  const doc = await Content.findOne({ key });
  if (!doc) throw new ApiError(404, `Content for "${key}" has not been seeded yet.`);

  return new ApiResponse(200, `${key} fetched`, { [key]: doc.data }).send(res);
});

/** GET /api/content — everything at once, handy for the homepage's initial load */
const getAllContent = asyncHandler(async (req, res) => {
  const docs = await Content.find();
  const payload = docs.reduce((acc, d) => ({ ...acc, [d.key]: d.data }), {});
  return new ApiResponse(200, 'All content fetched', payload).send(res);
});

module.exports = { getContent, getAllContent };
