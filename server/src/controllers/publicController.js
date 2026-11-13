// Customer-facing endpoints. The browser may send trip details and a contact; it can NOT send a fare, a distance,
// a status or a payment result: those fields are never read.
const crypto = require('crypto');
const config = require('../config');
const { estimateTrip } = require('../services/pricingEngine');
const { calendarDays } = require('../services/pricingEngine');
const { validateTrip, validateContact } = require('../services/tripValidation');
const { getRoute } = require('../services/routeService');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const sameHash = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const newReference = () => { const d = new Date(); return `B-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`; };
const istDate = (d) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
const stripInternal = ({ rulesSnapshot, ...rest }) => rest; // rate details stay on the server

// Default dependencies use the database. Tests pass fakes instead, so the logic runs without MongoDB or Google.
const defaultDeps = () => ({
  getSettings: () => require('../models/PricingSettings').findOne({ key: 'default' }).lean(),
  getRoute: (trip) => getRoute(trip, { apiKey: config.googleMapsApiKey }),
  upsertCustomer: (c) => require('../models/Customer').findOneAndUpdate({ mobile: c.mobile }, { $set: { name: c.name, email: c.email } }, { upsert: true, new: true, setDefaultsOnInsert: true }),
  createBooking: (doc) => require('../models/Booking').create(doc),
  findBooking: (ref) => require('../models/Booking').findOne({ reference: ref }),
  findQuote: (id) => (id ? require('../models/Quote').findById(id) : null),
});

// Turns validated trip + trusted route + settings into the customer-safe estimate response.
function buildEstimate(trip, settings, route) {
  const cats = (settings?.vehicleCategories || []).filter((c) => c.active !== false);
  const chosen = cats.find((c) => c.key === trip.vehicleKey);
  const keys = chosen ? [chosen.key] : cats.map((c) => c.key); // no preference: show each category, never pick one for the customer
  const base = { tripType: trip.tripType, passengers: trip.passengers, stopsCount: trip.stops.length, multiDayFlag: trip.multiDay, departureAt: trip.departureAt, returnAt: trip.returnAt, route: route.ok ? route : null };
  const results = (keys.length ? keys : ['']).map((k) => estimateTrip({ ...base, categoryKey: k }, settings));
  const outM = route.ok ? route.outboundMeters : null;
  const totalM = route.ok ? route.outboundMeters + (route.returnMeters || 0) : null;
  const one = results.length === 1 ? results[0] : null;
  return {
    distanceKm: totalM == null ? null : Math.round(totalM / 100) / 10,
    oneLegKm: outM == null ? null : Math.round(outM / 100) / 10,
    durationMin: route.ok ? Math.round(route.durationSeconds / 60) : null,
    // A rupee figure is only given for a COMPLETE estimate for one chosen category. Otherwise the owner will quote.
    fareEstimate: one && one.status === 'complete' ? one.totalPaise / 100 : null,
    route: { available: !!route.ok, source: route.ok ? route.source : 'unavailable', unavailableReason: route.ok ? null : route.reason },
    estimate: one ? stripInternal(one) : null,
    estimates: results.length > 1 ? results.map(stripInternal) : undefined,
    estimateIsNotAQuote: true,
  };
}
const reviewReasons = (trip, settings, est) => {
  const r = new Set();
  const mr = settings?.manualReview || {};
  if (trip.stops.length && mr.multiStop !== false) r.add('MULTI_STOP');
  if ((trip.multiDay || calendarDays(trip.departureAt, trip.returnAt) > 1) && mr.multiDay !== false) r.add('MULTI_DAY');
  (est?.reasons || []).forEach((x) => r.add(x.code));
  if (!est || est.status !== 'complete') r.add('NO_COMPLETE_ESTIMATE');
  return [...r];
};

exports.makePublicController = (overrides = {}) => {
  const deps = { ...defaultDeps(), ...overrides };
  return {
    health: (req, res) => res.json({ ok: true }),

    async vehicleCategories(req, res) { // names and capacities only; rates are never exposed here
      const s = await deps.getSettings();
      const list = (s?.vehicleCategories || []).filter((c) => c.active !== false).map((c) => ({ key: c.key, label: c.label, seats: c.seats ?? null }));
      res.json({ categories: list, configured: list.length > 0 });
    },

    async estimate(req, res) { // POST /api/route-estimate  (flat trip fields, or { trip })
      const v = validateTrip(req.body?.trip || req.body);
      if (!v.ok) return res.status(400).json({ error: 'validation', errors: v.errors });
      const [settings, route] = [await deps.getSettings(), await deps.getRoute(v.value)];
      res.json(buildEstimate(v.value, settings, route));
    },

    async submit(req, res) { // POST /api/trip-requests  { trip, contact }
      const tv = validateTrip(req.body?.trip), cv = validateContact(req.body?.contact);
      if (!tv.ok || !cv.ok) return res.status(400).json({ error: 'validation', errors: { ...tv.errors, ...cv.errors } });
      const trip = tv.value;
      const settings = await deps.getSettings();
      const route = await deps.getRoute(trip);
      const out = buildEstimate(trip, settings, route);
      const first = out.estimate || (out.estimates && out.estimates[0]) || null;
      const token = crypto.randomBytes(12).toString('hex');
      const customer = await deps.upsertCustomer(cv.value);
      const booking = await deps.createBooking({
        reference: newReference(), trackingTokenHash: sha(token), customerId: customer._id,
        contact: { name: cv.value.name, mobile: cv.value.mobile, email: cv.value.email },
        tripType: trip.tripType, pickup: trip.pickup, destination: trip.destination, stops: trip.stops,
        departureAt: trip.departureAt, returnAt: trip.returnAt, passengers: trip.passengers, vehicleCategoryKey: trip.vehicleKey,
        multiDay: trip.multiDay, notes: cv.value.notes,
        routeSnapshot: route.ok ? { source: 'google', outboundMeters: route.outboundMeters, returnMeters: route.returnMeters, durationSeconds: route.durationSeconds, provider: route.provider, fetchedAt: route.fetchedAt } : { source: 'unavailable' },
        estimate: first, manualReviewReasons: reviewReasons(trip, settings, first),
        status: 'pending', statusHistory: [{ from: null, to: 'pending', by: 'customer', note: 'Request submitted' }],
      });
      // The tracking code is shown ONCE. Only its hash is stored. The booking is NOT confirmed: it waits for the owner.
      res.status(201).json({ reference: booking.reference, trackingToken: token, status: 'pending', message: 'Request received. The owner will review it and send a quote.' });
    },

    async getBooking(req, res) { // GET /api/bookings/:reference?token=...
      const b = await deps.findBooking(String(req.params.reference || '').toUpperCase());
      if (!b || !sameHash(b.trackingTokenHash, sha(req.query.token || ''))) return res.status(404).json({ error: 'not_found' }); // same answer for wrong ref or wrong code
      const q = await deps.findQuote(b.currentQuoteId);
      res.json(exports.customerView(b, q));
    },

    async respondToQuote(req, res) { // POST /api/bookings/:reference/quote-response { token, action }
      const b = await deps.findBooking(String(req.params.reference || '').toUpperCase());
      if (!b || !sameHash(b.trackingTokenHash, sha(req.body?.token || ''))) return res.status(404).json({ error: 'not_found' });
      const action = req.body?.action;
      if (!['accept', 'decline'].includes(action)) return res.status(400).json({ error: 'validation', message: 'action must be accept or decline.' });
      const q = await deps.findQuote(b.currentQuoteId);
      if (b.status !== 'quoted' || !q || q.status !== 'issued') return res.status(409).json({ error: 'no_open_quote', message: 'There is no open quote to respond to.' });
      if (b.routeChangedAfterQuote) return res.status(409).json({ error: 'quote_needs_revision', message: 'The route changed, so the owner must send a revised quote first.' });
      if (!q.noExpiry && q.validUntil && q.validUntil <= new Date()) return res.status(409).json({ error: 'quote_expired', message: 'This quote has expired. Ask the owner for a new one.' });
      const accept = action === 'accept';
      q.status = accept ? 'accepted' : 'declined'; q[accept ? 'acceptedAt' : 'declinedAt'] = new Date(); await q.save();
      const to = accept ? 'accepted' : 'pending'; // accepted = awaiting advance payment. NOT confirmed.
      b.statusHistory.push({ from: b.status, to, by: 'customer', note: accept ? 'Quote accepted' : 'Quote declined' }); b.status = to; await b.save();
      res.json({ status: b.status, message: accept ? 'Quote accepted. Your booking is confirmed only after the advance payment is verified.' : 'Quote declined.' });
    },
  };
};

// What a customer may see: never owner notes, internal rate snapshots, or other people's data.
exports.customerView = (b, q) => ({
  ref: b.reference, reference: b.reference, status: b.status,
  route: `${b.pickup} to ${b.destination}`, tripType: b.tripType === 'round-trip' ? 'Round trip' : 'One-way',
  date: istDate(b.departureAt), returnDate: b.returnAt ? istDate(b.returnAt) : null, passengers: b.passengers, stops: b.stops,
  estimate: b.estimate ? stripInternal(b.estimate) : null,
  quote: q && q.status !== 'draft' ? { versionNumber: q.versionNumber, status: (q.status === 'issued' && !q.noExpiry && q.validUntil && q.validUntil <= new Date()) ? 'expired' : q.status,
    lineItems: q.lineItems, subtotalPaise: q.subtotalPaise, taxPaise: q.taxPaise, totalPaise: q.totalPaise, advanceRequiredPaise: q.advanceRequiredPaise,
    tollsExcludedText: q.tollsExcludedText, validUntil: q.validUntil, noExpiry: q.noExpiry, notes: q.notes } : null,
  routeChangedAfterQuote: !!b.routeChangedAfterQuote,
  payment: null, // payments are not implemented yet
});
exports.buildEstimate = buildEstimate;
