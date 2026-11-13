// Creates the pricing-settings document with the category keys the frontend already offers, and NOTHING else decided:
// no seats, no rates, no charges. The owner fills those in (PUT /api/owner/pricing-settings). Safe to run more than once.
require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('../src/models/PricingSettings');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const exists = await Settings.findOne({ key: 'default' });
  if (exists) { console.log('Settings already exist. Nothing changed.'); return process.exit(0); }
  await Settings.create({ key: 'default', vehicleCategories: [
    { key: 'sedan', label: 'Sedan' }, { key: 'suv', label: 'SUV' }, { key: 'group', label: 'Larger group' } ] });
  console.log('Created empty pricing settings. Set seats and rates before expecting estimates.');
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
