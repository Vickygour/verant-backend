/**
 * Run with:  npm run seed          → populates the database
 *            npm run seed:destroy  → wipes Products/Content (keeps Users/Orders)
 *
 * Loads ./data.json — a direct, byte-for-byte extraction of the original
 * frontend's src/data/products.js (PRODUCTS, LOOKS, CRAFT, TESTIMONIALS,
 * CATEGORY_TILES, SIZE_OPTIONS, COLOR_OPTIONS, MATERIAL_OPTIONS) — so your
 * catalogue in MongoDB starts out identical to what's on the site today.
 */
const path = require('path');
const connectDB = require('../config/db');
const env = require('../config/env');
const Product = require('../models/Product');
const Content = require('../models/Content');
const User = require('../models/User');

const data = require(path.join(__dirname, 'data.json'));

async function seedProducts() {
  await Product.deleteMany({});
  const docs = await Product.insertMany(data.products, { ordered: true });
  console.log(`[seed] Products inserted: ${docs.length}`);
}

async function seedContent() {
  await Content.deleteMany({});
  const entries = [
    { key: 'looks', data: data.looks },
    { key: 'craft', data: data.craft },
    { key: 'testimonials', data: data.testimonials },
    { key: 'categoryTiles', data: data.categoryTiles },
    { key: 'sizeOptions', data: data.sizeOptions },
    { key: 'colorOptions', data: data.colorOptions },
    { key: 'materialOptions', data: data.materialOptions },
  ];
  await Content.insertMany(entries, { ordered: true });
  console.log(`[seed] Content sections inserted: ${entries.length}`);
}

async function seedAdmin() {
  const existing = await User.findOne({ email: env.ADMIN_EMAIL });
  if (existing) {
    console.log(`[seed] Admin already exists (${env.ADMIN_EMAIL}), skipping.`);
    return;
  }

  await User.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    role: 'admin',
    isVerified: true, // admin doesn't need the OTP flow
  });

  console.log(`[seed] Admin account created → ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD}`);
  console.log('[seed] ⚠️  Change this password immediately after first login.');
}

async function destroy() {
  await connectDB();
  await Product.deleteMany({});
  await Content.deleteMany({});
  console.log('[seed] Products + Content collections wiped. Users/Orders left untouched.');
  process.exit(0);
}

async function run() {
  await connectDB();
  console.log('[seed] Connected. Seeding database...');

  await seedProducts();
  await seedContent();
  await seedAdmin();

  console.log('[seed] ✅ Done. Your MongoDB now mirrors the frontend catalogue.');
  process.exit(0);
}

if (process.argv.includes('--destroy')) {
  destroy().catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
} else {
  run().catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
}
