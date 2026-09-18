const express = require('express');
const ctrl = require('../controllers/review.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.patch('/:id/like', ctrl.likeReview); // public — simple "helpful" counter
router.delete('/:id', protect, ctrl.deleteReview); // owner or admin (checked in controller)

module.exports = router;
