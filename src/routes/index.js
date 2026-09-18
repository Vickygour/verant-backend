const express = require('express');

const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const orderRoutes = require('./order.routes');
const wishlistRoutes = require('./wishlist.routes');
const userRoutes = require('./user.routes');
const contentRoutes = require('./content.routes');
const reviewRoutes = require('./review.routes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/users', userRoutes);
router.use('/content', contentRoutes);
router.use('/reviews', reviewRoutes);

module.exports = router;
