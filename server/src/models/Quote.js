const mongoose = require('mongoose');
const { Schema } = mongoose;
const { QUOTE_STATUS, TOLLS_TEXT } = require('../constants');

// The owner's written price offer. Versioned: a revision supersedes the old one. Issued quotes are never edited.
// 'pricingSnapshot' freezes the rules and values used, so later settings changes cannot change an old quote.
const Quote = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  versionNumber: { type: Number, required: true },
  status: { type: String, enum: QUOTE_STATUS, default: 'draft' },
  lineItems: [{ code: String, label: String, amountPaise: Number, type: { type: String, enum: ['base', 'approved_extra', 'adjustment'] }, _id: false }],
  subtotalPaise: { type: Number, default: 0 },
  taxPaise: { type: Number, default: 0 },
  totalPaise: { type: Number, default: 0 },
  advanceRequiredPaise: { type: Number, default: null },              // advance rule is an unresolved owner decision
  tollsExcludedText: { type: String, default: TOLLS_TEXT },
  notes: { type: String, default: '' },
  pricingSnapshot: { type: Schema.Types.Mixed, default: null },       // settingsVersion, rates, route meters, estimate used
  issuedAt: Date, validUntil: { type: Date, default: null }, noExpiry: { type: Boolean, default: false },
  acceptedAt: Date, declinedAt: Date,
}, { timestamps: true });
Quote.index({ bookingId: 1, versionNumber: 1 }, { unique: true });
module.exports = mongoose.model('Quote', Quote);
