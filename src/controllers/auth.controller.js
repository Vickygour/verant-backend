const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const generateToken = require('../utils/generateToken');
const generateOtp = require('../utils/generateOtp');
const sendEmail = require('../utils/sendEmail');
const env = require('../config/env');
const {
  otpEmailTemplate,
  resetPasswordTemplate,
  welcomeEmailTemplate,
} = require('../utils/emailTemplates');

const OTP_TTL_MS = env.OTP_EXPIRY_MINUTES * 60 * 1000;

/**
 * POST /api/auth/signup
 * Creates an UNVERIFIED user and emails a 6-digit OTP.
 * Matches the frontend's signup → verify flow exactly.
 */
const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });

  if (existing && existing.isVerified) {
    throw new ApiError(409, 'An account with this email already exists. Please sign in.');
  }

  const otp = generateOtp();
  const otpExpires = new Date(Date.now() + OTP_TTL_MS);

  let user;
  if (existing && !existing.isVerified) {
    // Re-signup with same, still-unverified email: refresh their details + OTP
    existing.name = name;
    existing.password = password; // will be re-hashed by pre-save hook
    existing.otp = otp;
    existing.otpExpires = otpExpires;
    existing.otpPurpose = 'signup';
    user = await existing.save();
  } else {
    user = await User.create({
      name,
      email,
      password,
      otp,
      otpExpires,
      otpPurpose: 'signup',
      isVerified: false,
    });
  }

  await sendEmail({
    to: user.email,
    subject: 'Your VÉRANT verification code',
    html: otpEmailTemplate({ name: user.name, otp, minutes: env.OTP_EXPIRY_MINUTES }),
  });

  return new ApiResponse(201, `A 6-digit verification code has been sent to ${user.email}.`, {
    email: user.email,
  }).send(res);
});

/**
 * POST /api/auth/verify-otp
 * Confirms the signup OTP, marks the account verified, returns a JWT
 * so the user is logged straight in (same UX as the frontend's "verify" step).
 */
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select('+otp +otpExpires +otpPurpose');
  if (!user) throw new ApiError(404, 'No account found for this email.');

  if (user.isVerified) {
    throw new ApiError(400, 'This account is already verified. Please sign in.');
  }

  if (!user.otp || !user.otpExpires || user.otpPurpose !== 'signup') {
    throw new ApiError(400, 'No pending verification for this account. Please sign up again.');
  }

  if (user.otpExpires.getTime() < Date.now()) {
    throw new ApiError(400, 'This code has expired. Please request a new one.');
  }

  if (user.otp !== otp) {
    throw new ApiError(400, 'Incorrect verification code.');
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  user.otpPurpose = undefined;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Welcome to VÉRANT',
    html: welcomeEmailTemplate({ name: user.name }),
  }).catch(() => {}); // welcome email is best-effort, never blocks the response

  const token = generateToken(user._id, user.role);

  return new ApiResponse(200, 'Account verified. Welcome to the Maison.', {
    token,
    user: user.toSafeObject(),
  }).send(res);
});

/**
 * POST /api/auth/resend-otp
 * Re-issues a fresh OTP for either a pending signup or a password reset.
 * Rate-limited at the route level (otpLimiter) to stop inbox spam.
 */
const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email }).select('+otpPurpose');
  if (!user) throw new ApiError(404, 'No account found for this email.');
  if (user.isVerified) {
    throw new ApiError(400, 'This account is already verified. Please sign in.');
  }

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.otpPurpose = 'signup';
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Your new VÉRANT verification code',
    html: otpEmailTemplate({ name: user.name, otp, minutes: env.OTP_EXPIRY_MINUTES }),
  });

  return new ApiResponse(200, `A new verification code was sent to ${user.email}.`).send(res);
});

/**
 * POST /api/auth/login
 * Rate-limited via loginLimiter middleware on the route (5 attempts / 10 min).
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Incorrect email or password.');
  }

  if (!user.isVerified) {
    throw new ApiError(403, 'Please verify your email before signing in.');
  }

  const token = generateToken(user._id, user.role);

  return new ApiResponse(200, `Logged in as ${user.email}`, {
    token,
    user: user.toSafeObject(),
  }).send(res);
});

/**
 * POST /api/auth/forgot-password
 * Sends a password-reset OTP. Always responds the same way whether or not
 * the email exists, so attackers can't use this to enumerate accounts.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    const otp = generateOtp();
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = new Date(Date.now() + OTP_TTL_MS);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Reset your VÉRANT password',
      html: resetPasswordTemplate({ name: user.name, otp, minutes: env.OTP_EXPIRY_MINUTES }),
    });
  }

  return new ApiResponse(
    200,
    'If an account exists for this email, a reset code has been sent.',
  ).send(res);
});

/**
 * POST /api/auth/reset-password
 * Verifies the reset OTP and sets a new password.
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordExpires');
  if (!user || !user.resetPasswordOtp || !user.resetPasswordExpires) {
    throw new ApiError(400, 'Invalid or expired reset request.');
  }

  if (user.resetPasswordExpires.getTime() < Date.now()) {
    throw new ApiError(400, 'This reset code has expired. Please request a new one.');
  }

  if (user.resetPasswordOtp !== otp) {
    throw new ApiError(400, 'Incorrect reset code.');
  }

  user.password = newPassword; // re-hashed by pre-save hook
  user.resetPasswordOtp = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return new ApiResponse(200, 'Password reset successfully. Please sign in.').send(res);
});

/**
 * GET /api/auth/me
 * Protected — returns the logged-in user's profile.
 */
const getMe = asyncHandler(async (req, res) => {
  return new ApiResponse(200, 'Profile fetched', { user: req.user.toSafeObject() }).send(res);
});

module.exports = {
  signup,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  getMe,
};
