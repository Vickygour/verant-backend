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

// Signup sends an OTP email — rate limited to stop mailbox spam
router.post('/signup', otpLimiter, signupValidator, validate, ctrl.signup);

// Verify the OTP sent on signup → activates account + logs the user in
router.post('/verify-otp', verifyOtpValidator, validate, ctrl.verifyOtp);

// Resend OTP (also rate limited)
router.post('/resend-otp', otpLimiter, resendOtpValidator, validate, ctrl.resendOtp);

// Login — the specific endpoint the brute-force limiter protects
router.post('/login', loginLimiter, loginValidator, validate, ctrl.login);

// Forgot / reset password
router.post('/forgot-password', otpLimiter, forgotPasswordValidator, validate, ctrl.forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, ctrl.resetPassword);

// Current logged-in user
router.get('/me', protect, ctrl.getMe);

module.exports = router;
