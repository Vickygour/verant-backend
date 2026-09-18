const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema(
  {
    n: { type: String, required: true }, // color name, e.g. "Deep Emerald"
    h: { type: String, required: true }, // hex code, e.g. "#0B3D2E"
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    // Legacy numeric id kept for frontend compatibility (was PRODUCTS[i].id)
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    cat: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Sneakers', 'T-Shirts', 'Shirts', 'Hoodies', 'Jackets', 'Trousers', 'Accessories'],
      index: true,
    },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    badge: { type: String, default: '' }, // BESTSELLER | NEW | LIMITED | ICON | ""
    isNewArrival: { type: Boolean, default: false },
    isBest: { type: Boolean, default: false },
    sizes: { type: [String], default: [] },
    colors: { type: [colorSchema], default: [] },
    material: { type: String, default: '' },
    fit: { type: String, default: '' },
    stock: { type: Number, default: 0, min: 0 },
    tagline: { type: String, default: '' },
    desc: { type: String, default: '' },
    care: { type: String, default: '' },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ name: 'text', desc: 'text', tagline: 'text' });

productSchema.pre('validate', function generateSlug(next) {
  if (!this.slug && this.name) {
    this.slug = `${this.name}-${this.id}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

productSchema.virtual('inStock').get(function inStock() {
  return this.stock > 0;
});

productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
