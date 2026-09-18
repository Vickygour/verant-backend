const { body } = require('express-validator');

const signupValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginValidator = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const verifyOtpValidator = [
  body('email').trim().notEmpty().isEmail().withMessage('Enter a valid email'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must be numeric'),
];

const resendOtpValidator = [
  body('email').trim().notEmpty().isEmail().withMessage('Enter a valid email'),
];

const forgotPasswordValidator = [
  body('email').trim().notEmpty().isEmail().withMessage('Enter a valid email'),
];

const resetPasswordValidator = [
  body('email').trim().notEmpty().isEmail().withMessage('Enter a valid email'),
  body('otp').trim().notEmpty().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

module.exports = {
  signupValidator,
  loginValidator,
  verifyOtpValidator,
  resendOtpValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
};
