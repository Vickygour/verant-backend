const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/** PATCH /api/users/me — update name/phone (email + password changed via dedicated flows) */
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone) user.phone = phone;
  await user.save();

  return new ApiResponse(200, 'Profile updated', { user: user.toSafeObject() }).send(res);
});

/** POST /api/users/me/addresses — save a new address to the address book */
const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses.push(req.body);
  await user.save();
  return new ApiResponse(201, 'Address saved', { addresses: user.addresses }).send(res);
});

/** DELETE /api/users/me/addresses/:addressId */
const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const before = user.addresses.length;
  user.addresses = user.addresses.filter((a) => a._id.toString() !== req.params.addressId);

  if (user.addresses.length === before) throw new ApiError(404, 'Address not found');

  await user.save();
  return new ApiResponse(200, 'Address removed', { addresses: user.addresses }).send(res);
});

// --- Admin ---

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  return new ApiResponse(200, 'Users fetched', { users }).send(res);
});

module.exports = { updateMe, addAddress, deleteAddress, getAllUsers };
