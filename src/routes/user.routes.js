const express = require('express');
const ctrl = require('../controllers/user.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect); // every route below requires login

router.patch('/me', ctrl.updateMe);
router.post('/me/addresses', ctrl.addAddress);
router.delete('/me/addresses/:addressId', ctrl.deleteAddress);

// Admin only
router.get('/', authorize('admin'), ctrl.getAllUsers);

module.exports = router;
