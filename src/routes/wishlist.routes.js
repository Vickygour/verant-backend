const express = require('express');
const ctrl = require('../controllers/wishlist.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect); // every wishlist route requires login

router.get('/', ctrl.getWishlist);
router.post('/:productId', ctrl.toggleWishlist);

module.exports = router;
