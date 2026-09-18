const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const sendEmail = require('../utils/sendEmail');
const { orderConfirmationTemplate } = require('../utils/emailTemplates');

const FREE_SHIPPING_THRESHOLD = 8000;
const STANDARD_SHIPPING = 199;
const EXPRESS_SHIPPING = 499;

/** Mirrors src/lib/constants.js `shippingCost()` on the frontend. */
function shippingCost(subtotal, method = 'standard') {
  if (subtotal <= 0) return 0;
  if (method === 'express') return EXPRESS_SHIPPING;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
}

/** Generates a human-friendly order id, e.g. VRT-8F3K9A2Q */
function createOrderId() {
  return `VRT-${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

/**
 * POST /api/orders
 * Recomputes prices/stock SERVER-SIDE from the database — never trusts
 * prices sent by the client. This is the one non-negotiable rule for any
 * real checkout endpoint.
 */
const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, shipMethod = 'standard', paymentMethod, upiId } = req.body;

  // Re-fetch every product from DB to trust nothing from the client
  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const orderItems = [];
  let subtotal = 0;

  for (const line of items) {
    const product = productMap.get(Number(line.productId));
    if (!product) {
      throw new ApiError(404, `Product ${line.productId} no longer exists.`);
    }
    if (!product.isActive || product.stock <= 0) {
      throw new ApiError(400, `${product.name} is currently sold out.`);
    }
    if (line.qty > product.stock) {
      throw new ApiError(400, `Only ${product.stock} unit(s) left for ${product.name}.`);
    }
    if (product.sizes.length && !product.sizes.includes(line.size)) {
      throw new ApiError(400, `Size "${line.size}" is not available for ${product.name}.`);
    }

    orderItems.push({
      product: product._id,
      productId: product.id,
      name: product.name,
      image: product.images?.[0],
      price: product.price,
      qty: line.qty,
      size: line.size,
      color: line.color,
    });

    subtotal += product.price * line.qty;
  }

  const shipping = shippingCost(subtotal, shipMethod);
  const total = subtotal + shipping;

  const order = await Order.create({
    orderId: createOrderId(),
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    shipMethod,
    paymentMethod,
    upiId: paymentMethod === 'upi' ? upiId : undefined,
    subtotal,
    shipping,
    total,
  });

  // Decrement stock for each purchased line (best-effort, non-transactional
  // for simplicity — wrap in a Mongo session/transaction for production scale)
  await Promise.all(
    orderItems.map((line) =>
      Product.updateOne({ _id: line.product }, { $inc: { stock: -line.qty } }),
    ),
  );

  sendEmail({
    to: shippingAddress.email,
    subject: `Your VÉRANT order ${order.orderId} is confirmed`,
    html: orderConfirmationTemplate({
      name: shippingAddress.name,
      orderId: order.orderId,
      total: order.total,
      items: orderItems,
    }),
  }).catch(() => {}); // email failure should never fail the order

  return new ApiResponse(201, 'Order placed successfully', { order }).send(res);
});

/** GET /api/orders/my — logged-in user's own order history */
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  return new ApiResponse(200, 'Orders fetched', { orders }).send(res);
});

/** GET /api/orders/:orderId — a single order (owner or admin only) */
const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const query = mongoose.isValidObjectId(orderId) ? { _id: orderId } : { orderId };
  const order = await Order.findOne(query);

  if (!order) throw new ApiError(404, 'Order not found');

  const isOwner = order.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'You do not have access to this order.');
  }

  return new ApiResponse(200, 'Order fetched', { order }).send(res);
});

// --- Admin ---

const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
  return new ApiResponse(200, 'All orders fetched', { orders }).send(res);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, paymentStatus } = req.body;
  const order = await Order.findById(req.params.orderId);
  if (!order) throw new ApiError(404, 'Order not found');

  if (status) order.status = status;
  if (paymentStatus) order.paymentStatus = paymentStatus;
  await order.save();

  return new ApiResponse(200, 'Order updated', { order }).send(res);
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};
