const mongoose = require('mongoose');
const { Schema } = mongoose;
// Costs the owner records against a trip (tolls paid, parking...). How tolls are collected from customers is unresolved.
const TripExpense = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  type: { type: String, enum: ['toll', 'parking', 'fuel', 'other'], required: true },
  amountPaise: { type: Number, required: true, min: 1 },
  paidBy: { type: String, enum: ['owner', 'driver', 'customer'], required: true },
  recoverableFromCustomer: { type: Boolean, default: false },
  note: String, recordedBy: String,
}, { timestamps: true });
module.exports = mongoose.model('TripExpense', TripExpense);
