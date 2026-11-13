const express = require('express');
const rateLimit = require('express-rate-limit');
const { makePublicController } = require('../controllers/publicController');
const c = makePublicController();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); // Express 4 does not catch async errors itself
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }); // slows spam on public POSTs
const r = express.Router();
r.get('/health', c.health);
r.get('/vehicle-categories', wrap(c.vehicleCategories));
r.post('/route-estimate', limiter, wrap(c.estimate));
r.post('/trip-requests', limiter, wrap(c.submit));
r.get('/bookings/:reference', limiter, wrap(c.getBooking));
r.post('/bookings/:reference/quote-response', limiter, wrap(c.respondToQuote));
module.exports = r;
