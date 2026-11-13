const mongoose = require('mongoose');
const { Schema } = mongoose;

// ONE document (key 'default') holding every owner-decided pricing rule.
// RULE: null means "owner has not decided". 0 means "owner decided: no charge". The engine treats them differently.
const Category = new Schema({
  key: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
  label: { type: String, required: true, trim: true },
  seats: { type: Number, min: 1, default: null },            // passenger capacity (null = not set yet)
  ratePerKmPaise: { type: Number, min: 0, default: null },   // owner-configured, per category (null = not set)
  active: { type: Boolean, default: true },
}, { _id: false });

const PricingSettings = new Schema({
  key: { type: String, default: 'default', unique: true },
  version: { type: Number, default: 1 },                     // bumped on every change; quotes remember it
  // Distance rules
  maxOneWayKm: { type: Number, min: 1, default: 1000 },      // PROVISIONAL working value, pending owner approval
  maxDistanceConfirmed: { type: Boolean, default: false },   // stays false until the owner approves 1,000 km
  distanceLimitAppliesTo: { type: String, enum: ['perLeg', 'roundTripTotal', null], default: null },
  minDistanceKm: { type: Number, min: 0, default: null },
  outOfRangeBehaviour: { type: String, enum: ['block', 'manual_review', null], default: null },
  roundTripBilling: { type: String, enum: ['sum_of_legs', null], default: null }, // how billable km are found for round trips
  // Rates
  vehicleCategories: { type: [Category], default: [] },
  // Optional charges: null = unresolved, 0 = no charge, >0 = approved amount in paise
  driverAllowancePerDayPaise: { type: Number, min: 0, default: null },
  driverAllowanceMode: { type: String, enum: ['every_day', 'multi_day_only', null], default: null },
  overnightChargePerNightPaise: { type: Number, min: 0, default: null },
  extraStopChargePaise: { type: Number, min: 0, default: null },
  waitingChargePerHourPaise: { type: Number, min: 0, default: null }, // used by the owner when quoting, never auto-estimated
  minimumFarePaise: { type: Number, min: 0, default: null },
  passengerSurcharge: { type: Schema.Types.Mixed, default: null },    // null or { freeUpTo, perExtraPassengerPaise } (only if approved)
  emptyReturn: { type: Schema.Types.Mixed, default: null },           // null | {mode:'none'} | {mode:'percent_of_base', percent} | {mode:'manual'}
  tax: { type: Schema.Types.Mixed, default: null },                   // null | {mode:'none'} | {mode:'percent', percent, label}
  // Review rules and quote validity
  manualReview: { type: Schema.Types.Mixed, default: { multiStop: true, multiDay: true } },
  quoteValidityHours: { type: Number, min: 1, default: null },
  updatedBy: { type: String, default: 'system' },
}, { timestamps: true });

module.exports = mongoose.model('PricingSettings', PricingSettings);
