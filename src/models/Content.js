const mongoose = require('mongoose');

/**
 * Generic key → JSON blob store for marketing content that isn't a
 * first-class commerce entity (lookbook grid, craft/process section,
 * customer testimonials). Keeps these editable from the DB (or a future
 * admin panel) without needing a dedicated schema for each tiny section.
 */
const contentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ['looks', 'craft', 'testimonials', 'categoryTiles', 'sizeOptions', 'colorOptions', 'materialOptions'],
    },
    data: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

module.exports = mongoose.model('Content', contentSchema);
