const mongoose = require('mongoose');
const Driver = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true },
  licenceNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  licenceExpiry: { type: Date, default: null },
  status: { type: String, enum: ['active', 'on_leave', 'inactive'], default: 'active' },
  notes: { type: String, default: '' },
}, { timestamps: true });
module.exports = mongoose.model('Driver', Driver);
