const { OAuth2Client } = require('google-auth-library');
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
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

/* ------------------------------------------------------------------ */
/*  LOCAL AUTH (email + password + OTP)                                */
/* ------------------------------------------------------------------ */

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
    existing.name = name;
    existing.password = password;
    existing.authProvider = 'local';
    existing.otp = otp;
    existing.otpExpires = otpExpires;
    existing.otpPurpose = 'signup';
    user = await existing.save();
  } else {
    user = await User.create({
      name,
      email,
      password,
      authProvider: 'local',
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
  }).catch(() => { });

  const token = generateToken(user._id, user.role);

  return new ApiResponse(200, 'Account verified. Welcome to the Maison.', {
    token,
    user: user.toSafeObject(),
  }).send(res);
});

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

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Incorrect email or password.');
  }

  if (user.authProvider === 'google' && !user.password) {
    throw new ApiError(400, 'This account uses Google Sign-In. Please continue with Google.');
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

/* ------------------------------------------------------------------ */
/*  GOOGLE SIGN-IN                                                     */
/* ------------------------------------------------------------------ */

/**
 * POST /api/auth/google
 * Frontend sends the Google ID token (credential), we verify it,
 * then create/login the user and return our own JWT.
 */
const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new ApiError(400, 'Google ID token is required.');
  }

  // Verify the ID token with Google
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { email, name, picture, email_verified, sub: googleId } = payload;

  if (!email_verified) {
    throw new ApiError(400, 'Google email is not verified.');
  }

  let user = await User.findOne({ email });

  if (!user) {
    // First time — create the account, already verified by Google
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      authProvider: 'google',
      googleId,
      avatar: picture || '',
      isVerified: true,
    });
  } else {
    // Existing user — link Google if not linked yet
    if (user.authProvider !== 'google') {
      user.authProvider = 'google';
      user.googleId = googleId;
      if (!user.avatar) user.avatar = picture || '';
      user.isVerified = true;
      await user.save();
    } else if (!user.avatar && picture) {
      user.avatar = picture;
      await user.save();
    }
  }

  const token = generateToken(user._id, user.role);

  return new ApiResponse(200, `Logged in as ${user.email}`, {
    token,
    user: user.toSafeObject(),
  }).send(res);
});

/* ------------------------------------------------------------------ */
/*  PASSWORD RESET                                                     */
/* ------------------------------------------------------------------ */

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (user && user.authProvider === 'local') {
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

  user.password = newPassword;
  user.authProvider = 'local';
  user.resetPasswordOtp = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return new ApiResponse(200, 'Password reset successfully. Please sign in.').send(res);
});

/* ------------------------------------------------------------------ */
/*  PROFILE                                                            */
/* ------------------------------------------------------------------ */

const getMe = asyncHandler(async (req, res) => {
  return new ApiResponse(200, 'Profile fetched', { user: req.user.toSafeObject() }).send(res);
});

module.exports = {
  signup,
  verifyOtp,
  resendOtp,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  getMe,
};