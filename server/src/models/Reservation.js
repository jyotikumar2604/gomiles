const mongoose = require('mongoose');
const { Schema } = mongoose;
const { RESERVATION_TYPE, RESERVATION_STATUS } = require('../constants');
// A block of time on a vehicle (and driver). 'hold' is temporary and has an expiry; 'confirmed' is firm.
// Hold length, buffer length and assignment timing are unresolved owner decisions, so none is defaulted.
const Reservation = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver', default: null },
  type: { type: String, enum: RESERVATION_TYPE, required: true },
  status: { type: String, enum: RESERVATION_STATUS, default: 'active' },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },                              // full trip interval including return
  bufferMinutes: { type: Number, min: 0, default: 0 },
  holdExpiresAt: { type: Date, default: null },
  releasedReason: { type: String, default: '' },
}, { timestamps: true });
Reservation.index({ vehicleId: 1, startAt: 1, endAt: 1 });
Reservation.index({ driverId: 1, startAt: 1, endAt: 1 });
module.exports = mongoose.model('Reservation', Reservation);
