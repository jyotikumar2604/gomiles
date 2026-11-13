const mongoose = require('mongoose');
const Vehicle = new mongoose.Schema({
  registrationNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  categoryKey: { type: String, required: true },                      // must match a category in PricingSettings
  makeModel: { type: String, default: '' },
  seats: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['active', 'maintenance', 'retired'], default: 'active' },
  notes: { type: String, default: '' },
}, { timestamps: true });
module.exports = mongoose.model('Vehicle', Vehicle);
