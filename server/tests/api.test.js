// Exercises the real controller code (estimate, submit, status, quote response) with FAKE database and route functions,
// so it runs without MongoDB, Express or Google. It does not test the HTTP layer or the database itself.
const test = require('node:test'); const assert = require('node:assert/strict');
const crypto = require('crypto');
const { makePublicController, customerView } = require('../src/controllers/publicController');
const { getRoute } = require('../src/services/routeService');
const { completeSettings: S, futureDate, fakeRes, km } = require('./helpers');
const route = { ok: true, source: 'google', provider: 'google_routes', fetchedAt: new Date(), outboundMeters: km(200), returnMeters: null, durationSeconds: 9000 };
const body = (o = {}) => ({ pickup: 'A', destination: 'B', tripType: 'one-way', date: futureDate(5), time: '09:30', passengers: 3, vehicle: 'sedan', ...o });
const ctl = (o = {}) => makePublicController({ getSettings: async () => S(), getRoute: async () => route, ...o });
const call = async (fn, req) => { const res = fakeRes(); await fn({ body: {}, query: {}, params: {}, ...req }, res); return res; };

test('estimate: rupee figure from server-trusted route; browser fare/distance ignored; rates not exposed', async () => {
  const res = await call(ctl().estimate, { body: body({ fare: 1, distanceKm: 2, estimate: { totalPaise: 1 } }) });
  assert.equal(res.code, 200); assert.equal(res.body.distanceKm, 200); assert.equal(res.body.fareEstimate, 2000); assert.equal(res.body.estimateIsNotAQuote, true);
  assert.equal('rulesSnapshot' in res.body.estimate, false); assert.equal(res.body.durationMin, 150);
});
test('estimate: route lookup failure -> no distance, no fare, never a made-up number', async () => {
  const res = await call(ctl({ getRoute: async () => ({ ok: false, reason: 'not_configured' }) }).estimate, { body: body() });
  assert.equal(res.body.distanceKm, null); assert.equal(res.body.fareEstimate, null); assert.equal(res.body.estimate.status, 'unavailable'); assert.equal(res.body.route.unavailableReason, 'not_configured');
});
test('estimate: no pricing settings or no rate -> no fare', async () => {
  assert.equal((await call(ctl({ getSettings: async () => null }).estimate, { body: body() })).body.fareEstimate, null);
  assert.equal((await call(ctl().estimate, { body: body({ vehicle: 'suv' }) })).body.fareEstimate, null);
});
test('estimate: no vehicle preference -> per-category list, no single fare picked for the customer', async () => {
  const res = await call(ctl().estimate, { body: body({ vehicle: '' }) });
  assert.equal(res.body.fareEstimate, null); assert.equal(res.body.estimates.length, 2);
});
test('estimate: invalid input -> 400 with field errors', async () => { const res = await call(ctl().estimate, { body: body({ pickup: '' }) }); assert.equal(res.code, 400); assert.ok(res.body.errors.pickup); });
test('vehicle categories: names and seats only', async () => { const res = await call(ctl().vehicleCategories, {}); assert.equal(res.body.categories[0].seats, 4); assert.equal(JSON.stringify(res.body).includes('ratePerKm'), false); });

function store() {
  const s = { booking: null, quote: null, customers: [] };
  return { s, deps: { upsertCustomer: async (c) => { s.customers.push(c); return { _id: 'c1', ...c }; }, createBooking: async (d) => { s.booking = { ...d, statusHistory: [...d.statusHistory], save: async () => {} }; return s.booking; },
    findBooking: async (r) => (s.booking && s.booking.reference === r ? s.booking : null), findQuote: async () => s.quote } };
}
test('submit: creates a PENDING request, never confirmed; browser status/payment/fare ignored; token stored hashed', async () => {
  const { s, deps } = store();
  const res = await call(ctl(deps).submit, { body: { trip: body({ status: 'confirmed', fare: 1 }), contact: { name: 'Test', phone: '9876543210' }, status: 'confirmed', paymentStatus: 'paid' } });
  assert.equal(res.code, 201); assert.equal(res.body.status, 'pending'); assert.equal(s.booking.status, 'pending');
  assert.equal(s.booking.trackingTokenHash, crypto.createHash('sha256').update(res.body.trackingToken).digest('hex')); assert.notEqual(s.booking.trackingTokenHash, res.body.trackingToken);
  assert.equal(s.booking.estimate.totalPaise, 200000); assert.equal(s.booking.routeSnapshot.source, 'google'); assert.equal(JSON.stringify(s.booking).includes('paid'), false);
});
test('submit: no route -> still accepted for manual review with source unavailable', async () => {
  const { s, deps } = store();
  const res = await call(ctl({ ...deps, getRoute: async () => ({ ok: false, reason: 'not_configured' }) }).submit, { body: { trip: body(), contact: { name: 'T', phone: '9876543210' } } });
  assert.equal(res.code, 201); assert.equal(s.booking.routeSnapshot.source, 'unavailable'); assert.ok(s.booking.manualReviewReasons.includes('NO_COMPLETE_ESTIMATE'));
});
test('submit: invalid contact or trip -> 400, nothing stored', async () => {
  const { s, deps } = store();
  const res = await call(ctl(deps).submit, { body: { trip: body(), contact: { name: '', phone: '1' } } });
  assert.equal(res.code, 400); assert.equal(s.booking, null);
});
test('booking status: wrong code and wrong reference look the same (404); right code shows a customer-safe view', async () => {
  const { s, deps } = store(); const c = ctl(deps);
  const sub = await call(c.submit, { body: { trip: body(), contact: { name: 'T', phone: '9876543210' } } });
  s.booking.ownerNotes = 'SECRET'; s.booking.departureAt = new Date(s.booking.departureAt); s.booking.pickup = 'A';
  assert.equal((await call(c.getBooking, { params: { reference: s.booking.reference }, query: { token: 'wrong' } })).code, 404);
  assert.equal((await call(c.getBooking, { params: { reference: 'NOPE' }, query: { token: sub.body.trackingToken } })).code, 404);
  const ok = await call(c.getBooking, { params: { reference: s.booking.reference }, query: { token: sub.body.trackingToken } });
  assert.equal(ok.code, 200); assert.equal(ok.body.status, 'pending'); assert.equal(ok.body.payment, null); assert.equal(JSON.stringify(ok.body).includes('SECRET'), false); assert.equal('rulesSnapshot' in ok.body.estimate, false);
});
test('quote response: needs an open issued quote; expired and route-changed quotes cannot be accepted; accepting does not confirm', async () => {
  const { s, deps } = store(); const c = ctl(deps);
  const sub = await call(c.submit, { body: { trip: body(), contact: { name: 'T', phone: '9876543210' } } });
  const ref = s.booking.reference, token = sub.body.trackingToken;
  assert.equal((await call(c.respondToQuote, { params: { reference: ref }, body: { token, action: 'accept' } })).code, 409); // nothing quoted yet
  s.booking.status = 'quoted'; s.booking.currentQuoteId = 'q1';
  s.quote = { status: 'issued', noExpiry: false, validUntil: new Date(Date.now() - 1000), save: async () => {} };
  assert.equal((await call(c.respondToQuote, { params: { reference: ref }, body: { token, action: 'accept' } })).body.error, 'quote_expired');
  s.quote.validUntil = new Date(Date.now() + 1e6); s.booking.routeChangedAfterQuote = true;
  assert.equal((await call(c.respondToQuote, { params: { reference: ref }, body: { token, action: 'accept' } })).body.error, 'quote_needs_revision');
  s.booking.routeChangedAfterQuote = false;
  const acc = await call(c.respondToQuote, { params: { reference: ref }, body: { token, action: 'accept' } });
  assert.equal(acc.code, 200); assert.equal(s.booking.status, 'accepted'); assert.notEqual(s.booking.status, 'confirmed'); assert.equal(s.quote.status, 'accepted');
});

test('route service: parses Google-style reply, never calls without a key, reports failures, sums both legs', async () => {
  assert.deepEqual(await getRoute({ pickup: 'A', destination: 'B', stops: [], tripType: 'one-way' }, { apiKey: '' }), { ok: false, reason: 'not_configured' });
  let calls = 0; const fetchImpl = async (url, opt) => { calls++; assert.equal(opt.headers['X-Goog-Api-Key'], 'KEY'); return { ok: true, json: async () => ({ routes: [{ distanceMeters: 100000, duration: '3600s' }] }) }; };
  const r = await getRoute({ pickup: 'A', destination: 'B', stops: ['C'], tripType: 'round-trip' }, { apiKey: 'KEY', fetchImpl });
  assert.equal(calls, 2); assert.equal(r.outboundMeters, 100000); assert.equal(r.returnMeters, 100000); assert.equal(r.durationSeconds, 7200);
  assert.deepEqual(await getRoute({ pickup: 'A', destination: 'B', stops: [], tripType: 'one-way' }, { apiKey: 'K', fetchImpl: async () => ({ ok: false, status: 403 }) }), { ok: false, reason: 'api_error', status: 403 });
  assert.equal((await getRoute({ pickup: 'A', destination: 'B', stops: [], tripType: 'one-way' }, { apiKey: 'K', fetchImpl: async () => ({ ok: true, json: async () => ({}) }) })).reason, 'no_route');
});
