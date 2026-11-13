const mongoose = require('mongoose');
const { Schema } = mongoose;
const { BOOKING_STATUS } = require('../constants');

// The REQUEST record. It becomes a "confirmed booking" only when status === 'confirmed',
// which later requires an accepted quote AND a server-verified payment. Submitting never confirms.
const Booking = new Schema({
  reference: { type: String, required: true, unique: true },          // e.g. B-2610-7KQ4M2
  trackingTokenHash: { type: String, required: true },                // sha256 of the code shown once to the customer
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  contact: { name: String, mobile: String, email: String },           // snapshot at request time
  tripType: { type: String, enum: ['one-way', 'round-trip'], required: true },
  pickup: { type: String, required: true },
  destination: { type: String, required: true },
  stops: { type: [String], default: [] },
  departureAt: { type: Date, required: true },
  returnAt: { type: Date, default: null },
  passengers: { type: Number, required: true, min: 1 },
  vehicleCategoryKey: { type: String, default: '' },                  // customer preference only
  multiDay: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  // Trusted route facts, written ONLY by the server (Google) or by the owner (manual override with a reason)
  routeSnapshot: {
    source: { type: String, enum: ['google', 'owner_manual', 'unavailable'], default: 'unavailable' },
    outboundMeters: Number, returnMeters: Number, durationSeconds: Number,
    provider: String, fetchedAt: Date, manualReason: String,
  },
  estimate: { type: Schema.Types.Mixed, default: null },              // full output of the pricing engine at request time (NOT a quote)
  manualReviewReasons: { type: [String], default: [] },
  routeChangedAfterQuote: { type: Boolean, default: false },          // forces a revised quote before acceptance
  status: { type: String, enum: BOOKING_STATUS, default: 'pending' },
  statusHistory: [{ from: String, to: String, by: String, note: String, at: { type: Date, default: Date.now } }],
  currentQuoteId: { type: Schema.Types.ObjectId, ref: 'Quote', default: null },
  ownerNotes: { type: String, default: '' },                           // never shown to customers
}, { timestamps: true });
Booking.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model('Booking', Booking);
