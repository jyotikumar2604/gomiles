const mongoose = require('mongoose');
// Someone who requests trips. Guests are stored too (no password yet: guest vs account is an open owner decision).
const Customer = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  mobile: { type: String, required: true, unique: true },     // stored as +91XXXXXXXXXX
  email: { type: String, trim: true, lowercase: true, default: '' },
  role: { type: String, enum: ['customer'], default: 'customer' },
}, { timestamps: true });
module.exports = mongoose.model('Customer', Customer);
