const crypto = require('crypto');
const config = require('../config');
// TEMPORARY owner protection: a shared secret in the x-owner-key header. It is NOT a real login system.
// Replace with proper owner accounts and sessions before real customer data is stored. Fails closed if no key is set.
module.exports = function ownerAuth(req, res, next) {
  if (!config.ownerApiKey) return res.status(503).json({ error: 'owner_auth_not_configured', message: 'Set OWNER_API_KEY in server/.env to enable owner routes.' });
  const given = Buffer.from(String(req.get('x-owner-key') || ''));
  const want = Buffer.from(config.ownerApiKey);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return res.status(401).json({ error: 'unauthorized' });
  next();
};
