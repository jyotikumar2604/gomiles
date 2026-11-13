const mongoose = require('mongoose');
const { Schema } = mongoose;
// Model only. A refund REQUEST is not a refund: money has moved only when status === 'completed' with a gatewayRefundId.
// No refund percentages exist anywhere: the owner's policy is unresolved.
const Refund = new Schema({
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  status: { type: String, enum: ['requested', 'under_review', 'approved', 'denied', 'processing', 'completed', 'failed'], default: 'requested' },
  requestedBy: String,
  requestedAmountPaise: { type: Number, min: 0 },
  approvedAmountPaise: { type: Number, min: 0, default: null },       // set by the owner only
  decisionNote: String, decidedBy: String, decidedAt: Date,
  gatewayRefundId: { type: String, unique: true, sparse: true },
  completedAt: Date, failureReason: String,
}, { timestamps: true });
module.exports = mongoose.model('Refund', Refund);
