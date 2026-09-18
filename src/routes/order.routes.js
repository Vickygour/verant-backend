const express = require('express');
const ctrl = require('../controllers/order.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { orderLimiter } = require('../middlewares/rateLimiter.middleware');
const { createOrderValidator } = require('../validators/order.validator');

const router = express.Router();

router.post('/', protect, orderLimiter, createOrderValidator, validate, ctrl.createOrder);
router.get('/my', protect, ctrl.getMyOrders);
router.get('/all', protect, authorize('admin'), ctrl.getAllOrders);
router.get('/:orderId', protect, ctrl.getOrderById);
router.patch('/:orderId/status', protect, authorize('admin'), ctrl.updateOrderStatus);

module.exports = router;
