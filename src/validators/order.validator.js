const { body } = require('express-validator');

const createOrderValidator = [
  body('items').isArray({ min: 1 }).withMessage('Cart cannot be empty'),
  body('items.*.productId').notEmpty().withMessage('Each item needs a productId'),
  body('items.*.qty').isInt({ min: 1, max: 5 }).withMessage('Quantity must be between 1 and 5'),
  body('items.*.size').notEmpty().withMessage('Each item needs a size'),
  body('items.*.color').notEmpty().withMessage('Each item needs a color'),

  body('shippingAddress.name').trim().notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phone')
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('Enter a valid 10-digit phone number'),
  body('shippingAddress.email').trim().isEmail().withMessage('Enter a valid email'),
  body('shippingAddress.address').trim().notEmpty().withMessage('Address is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.pin')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Enter a valid 6-digit pincode'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),

  body('shipMethod').optional().isIn(['standard', 'express']),
  body('paymentMethod').isIn(['upi', 'card', 'cod']).withMessage('Invalid payment method'),
  body('upiId')
    .if(body('paymentMethod').equals('upi'))
    .matches(/^[\w.\-]+@[\w.\-]+$/)
    .withMessage('Enter a valid UPI ID (name@bank)'),
];

module.exports = { createOrderValidator };
