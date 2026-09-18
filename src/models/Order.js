const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productId: { type: Number, required: true }, // legacy numeric id snapshot
    name: { type: String, required: true }, // snapshot at time of order
    image: { type: String },
    price: { type: Number, required: true }, // snapshot price at time of order
    qty: { type: Number, required: true, min: 1 },
    size: { type: String, required: true },
    color: { type: String, required: true },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, match: [/^\d{10}$/, 'Phone must be 10 digits'] },
    email: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    pin: { type: String, required: true, match: [/^\d{6}$/, 'Pincode must be 6 digits'] },
    state: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    shippingAddress: { type: shippingAddressSchema, required: true },
    shipMethod: {
      type: String,
      enum: ['standard', 'express'],
      default: 'standard',
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'cod'],
      required: true,
    },
    upiId: { type: String },

    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

// COD orders stay "pending" payment until delivery/collection.
// UPI/Card are treated as paid immediately in this demo (swap for a real
// payment-gateway webhook — Razorpay/Stripe — in production).
orderSchema.pre('validate', function setPaymentStatus(next) {
  if (this.isNewArrival && this.paymentMethod !== 'cod') {
    this.paymentStatus = 'paid';
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
