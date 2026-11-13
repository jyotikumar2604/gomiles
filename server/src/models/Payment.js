const mongoose = require('mongoose');
const { Schema } = mongoose;
// Model only: NO payment code exists yet. One row = one gateway attempt. Money counts only when status === 'verified'
// after the SERVER checks the gateway signature. A browser "success" screen is never proof.
const Payment = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  quoteId: { type: Schema.Types.ObjectId, ref: 'Quote', required: true },
  purpose: { type: String, enum: ['advance', 'balance_online', 'balance_offline'], required: true },
  amountPaise: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['created', 'failed', 'awaiting_verification', 'verified', 'partially_refunded', 'refunded'], default: 'created' },
  gatewayName: String,
  gatewayOrderId: { type: String, unique: true, sparse: true },
  gatewayPaymentId: { type: String, unique: true, sparse: true },    // uniqueness stops duplicate webhook records
  signatureVerified: { type: Boolean, default: false },
  verifiedAt: Date,
  offlineNote: String, receivedBy: String,
}, { timestamps: true });
module.exports = mongoose.model('Payment', Payment);
