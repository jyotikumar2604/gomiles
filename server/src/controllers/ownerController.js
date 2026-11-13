// Owner endpoints (protected by middleware/ownerAuth). Everything is validated on the server.
const mongoose = require('mongoose');
const config = require('../config');
const { BOOKING_STATUS, OWNER_STATUS_MOVES } = require('../constants');
const Booking = require('../models/Booking'), Quote = require('../models/Quote'), Settings = require('../models/PricingSettings');
const Vehicle = require('../models/Vehicle'), Driver = require('../models/Driver'), Reservation = require('../models/Reservation');
const { estimateTrip, listUnresolvedPolicies } = require('../services/pricingEngine');
const { validateLineItems, totals } = require('../services/quoteMath');
const { validateSettingsPatch } = require('../services/settingsValidation');
const { getRoute } = require('../services/routeService');
const { findConflicts } = require('../services/reservationService');

const ok = mongoose.isValidObjectId;
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const bad = (res, message, code = 400) => res.status(code).json({ error: code === 404 ? 'not_found' : 'validation', message });
const settings = () => Settings.findOne({ key: 'default' }).lean();
const push = (b, to, note) => { b.statusHistory.push({ from: b.status, to, by: 'owner', note }); b.status = to; };

// ---- bookings ----
exports.listBookings = async (req, res) => {
  const f = {};
  if (req.query.status) { if (!BOOKING_STATUS.includes(req.query.status)) return bad(res, 'Unknown status.'); f.status = req.query.status; }
  if (req.query.q) { const r = new RegExp(esc(String(req.query.q).slice(0, 60)), 'i'); f.$or = [{ reference: r }, { 'contact.name': r }, { 'contact.mobile': r }]; }
  const rows = await Booking.find(f).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ bookings: rows.map((b) => ({ id: b._id, reference: b.reference, status: b.status, route: `${b.pickup} to ${b.destination}`, tripType: b.tripType, departureAt: b.departureAt,
    passengers: b.passengers, customer: b.contact?.name, mobile: b.contact?.mobile, manualReviewReasons: b.manualReviewReasons, estimateStatus: b.estimate?.status || null, createdAt: b.createdAt })) });
};
exports.getBooking = async (req, res) => {
  if (!ok(req.params.id)) return bad(res, 'Invalid id.');
  const b = await Booking.findById(req.params.id).lean();
  if (!b) return bad(res, 'Booking not found.', 404);
  const [quotes, reservations] = await Promise.all([Quote.find({ bookingId: b._id }).sort({ versionNumber: 1 }).lean(), Reservation.find({ bookingId: b._id }).lean()]);
  res.json({ booking: b, quotes, reservations });
};
exports.setStatus = async (req, res) => {
  const b = ok(req.params.id) && await Booking.findById(req.params.id);
  if (!b) return bad(res, 'Booking not found.', 404);
  const to = req.body?.status;
  if (!(OWNER_STATUS_MOVES[b.status] || []).includes(to)) return bad(res, `The owner cannot move a '${b.status}' booking to '${to}' here. Confirmation only follows an accepted quote and verified payment.`, 409);
  push(b, to, String(req.body?.note || '').slice(0, 300)); await b.save();
  res.json({ status: b.status });
};
// Route facts: re-ask Google, or enter them manually WITH a reason. A route change after a quote forces a revised quote.
exports.updateRoute = async (req, res) => {
  const b = ok(req.params.id) && await Booking.findById(req.params.id);
  if (!b) return bad(res, 'Booking not found.', 404);
  if (['cancelled', 'completed', 'rejected'].includes(b.status)) return bad(res, 'This booking is closed.', 409);
  let snap;
  if (req.body?.recalculate) {
    const r = await getRoute({ pickup: b.pickup, destination: b.destination, stops: b.stops, tripType: b.tripType }, { apiKey: config.googleMapsApiKey });
    if (!r.ok) return res.status(502).json({ error: 'route_unavailable', reason: r.reason });
    snap = { source: 'google', outboundMeters: r.outboundMeters, returnMeters: r.returnMeters, durationSeconds: r.durationSeconds, provider: r.provider, fetchedAt: r.fetchedAt };
  } else {
    const { outboundMeters: o, returnMeters: rt, durationSeconds: d, reason } = req.body || {};
    const m = (v) => Number.isInteger(v) && v > 0 && v <= 5e6;
    if (!m(o) || (b.tripType === 'round-trip' && !m(rt)) || !String(reason || '').trim()) return bad(res, 'Manual route needs outboundMeters (and returnMeters for round trips) as positive whole metres, plus a reason.');
    snap = { source: 'owner_manual', outboundMeters: o, returnMeters: b.tripType === 'round-trip' ? rt : null, durationSeconds: Number.isInteger(d) ? d : undefined, manualReason: String(reason).slice(0, 300), fetchedAt: new Date() };
  }
  b.routeSnapshot = snap;
  const s = await settings();
  const keys = b.vehicleCategoryKey || '';
  b.estimate = estimateTrip({ tripType: b.tripType, categoryKey: keys, passengers: b.passengers, stopsCount: b.stops.length, multiDayFlag: b.multiDay, departureAt: b.departureAt, returnAt: b.returnAt, route: snap }, s);
  if (b.currentQuoteId && ['quoted', 'accepted'].includes(b.status)) b.routeChangedAfterQuote = true;
  b.statusHistory.push({ from: b.status, to: b.status, by: 'owner', note: `Route updated (${snap.source})` });
  await b.save();
  res.json({ routeSnapshot: b.routeSnapshot, estimate: b.estimate, routeChangedAfterQuote: b.routeChangedAfterQuote });
};

// ---- quotes ----
exports.createQuoteDraft = async (req, res) => {
  const b = ok(req.params.id) && await Booking.findById(req.params.id);
  if (!b) return bad(res, 'Booking not found.', 404);
  if (!['pending', 'needs_info', 'quoted', 'accepted'].includes(b.status)) return bad(res, `Cannot quote a '${b.status}' booking.`, 409);
  const existing = await Quote.findOne({ bookingId: b._id, status: 'draft' });
  if (existing) return res.json({ quote: existing, note: 'An open draft already exists.' });
  const last = await Quote.findOne({ bookingId: b._id }).sort({ versionNumber: -1 }).lean();
  const s = await settings();
  const lines = b.estimate && b.estimate.status !== 'unavailable' ? b.estimate.lines.map((l) => ({ code: l.code, label: l.label, amountPaise: l.amountPaise, type: l.type })) : [];
  const t = totals(lines, s, 0);
  const q = await Quote.create({ bookingId: b._id, versionNumber: (last?.versionNumber || 0) + 1, status: 'draft', lineItems: lines, ...t,
    pricingSnapshot: { settingsVersion: s?.version ?? null, estimateStatus: b.estimate?.status ?? null, rules: b.estimate?.rulesSnapshot ?? null, route: b.routeSnapshot, draftedFromEstimate: lines.length > 0 } });
  res.status(201).json({ quote: q, estimateStatus: b.estimate?.status ?? null, excluded: b.estimate?.excluded ?? [] });
};
exports.updateQuote = async (req, res) => {
  const q = ok(req.params.id) && await Quote.findById(req.params.id);
  if (!q) return bad(res, 'Quote not found.', 404);
  if (q.status !== 'draft') return bad(res, 'Only draft quotes can be edited. Issue a revised version instead.', 409);
  const v = validateLineItems(req.body?.lineItems);
  if (!v.ok) return res.status(400).json({ error: 'validation', errors: v.errors });
  const t = totals(v.items, await settings(), req.body?.manualTaxPaise);
  const adv = req.body?.advanceRequiredPaise;
  if (adv != null && !(Number.isInteger(adv) && adv >= 0 && adv <= t.totalPaise)) return bad(res, 'advanceRequiredPaise must be null or a whole number from 0 to the total.');
  Object.assign(q, { lineItems: v.items, subtotalPaise: t.subtotalPaise, taxPaise: t.taxPaise, totalPaise: t.totalPaise, advanceRequiredPaise: adv ?? null, notes: String(req.body?.notes || '').slice(0, 1000) });
  q.set('pricingSnapshot.taxSource', t.taxSource); await q.save();
  res.json({ quote: q });
};
exports.issueQuote = async (req, res) => {
  const q = ok(req.params.id) && await Quote.findById(req.params.id);
  if (!q) return bad(res, 'Quote not found.', 404);
  if (q.status !== 'draft') return bad(res, 'Only a draft can be issued.', 409);
  const b = await Booking.findById(q.bookingId);
  if (!b || !['pending', 'needs_info', 'quoted', 'accepted'].includes(b.status)) return bad(res, 'The booking cannot receive a quote in its current state.', 409);
  if (!q.lineItems.length || q.totalPaise <= 0) return bad(res, 'A quote needs line items and a total above zero.');
  const s = await settings(); const now = new Date();
  if (s?.quoteValidityHours) q.validUntil = new Date(now.getTime() + s.quoteValidityHours * 3600000);
  else if (req.body?.validUntil && new Date(req.body.validUntil) > now) q.validUntil = new Date(req.body.validUntil);
  else if (req.body?.noExpiry === true) q.noExpiry = true;
  else return bad(res, 'Quote validity is not configured. Provide a future validUntil, or set noExpiry:true on purpose.');
  await Quote.updateMany({ bookingId: b._id, status: { $in: ['issued', 'accepted'] } }, { $set: { status: 'superseded' } });
  q.status = 'issued'; q.issuedAt = now; await q.save();
  b.currentQuoteId = q._id; b.routeChangedAfterQuote = false; push(b, 'quoted', `Quote v${q.versionNumber} issued`); await b.save();
  res.json({ quote: q, bookingStatus: b.status });
};

// ---- pricing settings ----
exports.getSettings = async (req, res) => { const s = await settings(); res.json({ settings: s, unresolved: listUnresolvedPolicies(s) }); };
exports.putSettings = async (req, res) => {
  const v = validateSettingsPatch(req.body);
  if (!v.ok) return res.status(400).json({ error: 'validation', errors: v.errors });
  const s = await Settings.findOneAndUpdate({ key: 'default' }, { $set: { ...v.patch, updatedBy: 'owner' }, $inc: { version: 1 } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean();
  res.json({ settings: s, unresolved: listUnresolvedPolicies(s) });
};

// ---- fleet ----
const list = (M) => async (req, res) => res.json({ items: await M.find().sort({ createdAt: -1 }).lean() });
const create = (M, fields) => async (req, res) => res.status(201).json({ item: await M.create(Object.fromEntries(fields.filter((k) => k in (req.body || {})).map((k) => [k, req.body[k]]))) });
const patch = (M, fields) => async (req, res) => {
  if (!ok(req.params.id)) return bad(res, 'Invalid id.');
  const set = Object.fromEntries(fields.filter((k) => k in (req.body || {})).map((k) => [k, req.body[k]]));
  const item = await M.findByIdAndUpdate(req.params.id, { $set: set }, { new: true, runValidators: true });
  item ? res.json({ item }) : bad(res, 'Not found.', 404);
};
const VF = ['registrationNumber', 'categoryKey', 'makeModel', 'seats', 'status', 'notes'], DF = ['name', 'mobile', 'licenceNumber', 'licenceExpiry', 'status', 'notes'];
exports.listVehicles = list(Vehicle); exports.createVehicle = create(Vehicle, VF); exports.patchVehicle = patch(Vehicle, VF);
exports.listDrivers = list(Driver); exports.createDriver = create(Driver, DF); exports.patchDriver = patch(Driver, DF);

// ---- availability and reservations ----
exports.availability = async (req, res) => {
  const from = new Date(req.query.from), to = new Date(req.query.to);
  if (Number.isNaN(+from) || Number.isNaN(+to) || to <= from) return bad(res, 'Provide from and to as ISO dates, with to after from.');
  const [vehicles, drivers, rs] = await Promise.all([Vehicle.find().lean(), Driver.find().lean(),
    Reservation.find({ status: 'active', startAt: { $lt: to }, endAt: { $gt: from } }).lean()]);
  const live = rs.filter((r) => r.type === 'confirmed' || (r.holdExpiresAt && r.holdExpiresAt > new Date()));
  res.json({ vehicles: vehicles.map((v) => ({ ...v, reservations: live.filter((r) => String(r.vehicleId) === String(v._id)) })),
    drivers: drivers.map((d) => ({ ...d, reservations: live.filter((r) => r.driverId && String(r.driverId) === String(d._id)) })) });
};
exports.createReservation = async (req, res) => {
  const { bookingId, vehicleId, driverId, type } = req.body || {};
  if (![bookingId, vehicleId].every(ok) || (driverId && !ok(driverId))) return bad(res, 'bookingId and vehicleId (and driverId if given) must be valid ids.');
  if (!['hold', 'confirmed'].includes(type)) return bad(res, "type must be 'hold' or 'confirmed'.");
  const [b, v, d] = await Promise.all([Booking.findById(bookingId), Vehicle.findById(vehicleId), driverId ? Driver.findById(driverId) : null]);
  if (!b || !v || (driverId && !d)) return bad(res, 'Booking, vehicle or driver not found.', 404);
  if (v.status !== 'active' || (d && d.status !== 'active')) return bad(res, 'Only an active vehicle and driver can be reserved.', 409);
  if (b.passengers > v.seats) return bad(res, `This vehicle seats ${v.seats}; the booking has ${b.passengers} passengers.`, 409);
  if (type === 'confirmed' && !['confirmed', 'active'].includes(b.status)) return bad(res, 'A confirmed reservation needs a confirmed booking (accepted quote and verified payment).', 409);
  const startAt = new Date(req.body.startAt), rawEnd = new Date(req.body.endAt), buf = Number.isInteger(req.body.bufferMinutes) && req.body.bufferMinutes >= 0 ? req.body.bufferMinutes : 0;
  if (Number.isNaN(+startAt) || Number.isNaN(+rawEnd) || rawEnd <= startAt) return bad(res, 'startAt and endAt must be valid, with endAt after startAt.');
  let holdExpiresAt = null;
  if (type === 'hold') { holdExpiresAt = new Date(req.body.holdExpiresAt); if (Number.isNaN(+holdExpiresAt) || holdExpiresAt <= new Date()) return bad(res, 'A hold needs a future holdExpiresAt (the hold length is an owner decision, so none is assumed).'); }
  const endAt = new Date(rawEnd.getTime() + buf * 60000);
  // NOTE: check-then-create has a tiny race if two owners click at the same instant. Production hardening: run both inside a MongoDB transaction.
  const conflicts = await findConflicts(Reservation, { vehicleId, driverId, startAt, endAt });
  if (conflicts.length) return res.status(409).json({ error: 'conflict', message: 'That vehicle or driver is already reserved in this period.', conflicts });
  res.status(201).json({ reservation: await Reservation.create({ bookingId, vehicleId, driverId: driverId || null, type, startAt, endAt, bufferMinutes: buf, holdExpiresAt }) });
};
