const express = require('express');
const ctrl = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const { protect } = require('../middlewares/auth.middleware');
const { loginLimiter, otpLimiter } = require('../middlewares/rateLimiter.middleware');
const {
  signupValidator,
  loginValidator,
  verifyOtpValidator,
  resendOtpValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../validators/auth.validator');

const router = express.Router();

// --- Local auth (email/password + OTP) ---
router.post('/signup', otpLimiter, signupValidator, validate, ctrl.signup);
router.post('/verify-otp', verifyOtpValidator, validate, ctrl.verifyOtp);
router.post('/resend-otp', otpLimiter, resendOtpValidator, validate, ctrl.resendOtp);
router.post('/login', loginLimiter, loginValidator, validate, ctrl.login);

// --- Google Sign-In ---
router.post('/google', loginLimiter, ctrl.googleLogin);

// --- Password reset ---
router.post('/forgot-password', otpLimiter, forgotPasswordValidator, validate, ctrl.forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, ctrl.resetPassword);

// --- Profile ---
router.get('/me', protect, ctrl.getMe);

module.exports = router;