const test = require('node:test'); const assert = require('node:assert/strict');
const { validateTrip, validateContact } = require('../src/services/tripValidation');
const { validateLineItems, totals } = require('../src/services/quoteMath');
const { validateSettingsPatch } = require('../src/services/settingsValidation');
const { overlaps } = require('../src/services/reservationService');
const { futureDate } = require('./helpers');
const good = () => ({ tripType: 'one-way', pickup: 'A', destination: 'B', date: futureDate(5), time: '09:30', passengers: 3 });

test('valid trip parses India time to UTC and ignores browser-sent money fields', () => {
  const v = validateTrip({ ...good(), fare: 1, distanceKm: 5, status: 'confirmed', paymentStatus: 'paid' });
  assert.equal(v.ok, true); assert.equal(v.value.departureAt.getUTCHours(), 4); assert.equal(v.value.departureAt.getUTCMinutes(), 0);
  for (const k of ['fare', 'distanceKm', 'status', 'paymentStatus']) assert.equal(k in v.value, false);
});
test('rejects past departure, same pickup/destination, bad passengers, return before departure', () => {
  assert.ok(validateTrip({ ...good(), date: '2020-01-01' }).errors.departure);
  assert.ok(validateTrip({ ...good(), destination: 'a' }).errors.destination);
  assert.ok(validateTrip({ ...good(), passengers: 0 }).errors.passengers);
  assert.ok(validateTrip({ ...good(), passengers: 2.5 }).errors.passengers);
  assert.ok(validateTrip({ ...good(), tripType: 'round-trip', returnDate: futureDate(4), returnTime: '10:00' }).errors.return);
  assert.equal(validateTrip({ ...good(), tripType: 'round-trip', returnDate: futureDate(6), returnTime: '10:00' }).ok, true);
  assert.ok(validateTrip({ ...good(), tripType: 'weekly' }).errors.tripType);
});
test('stops: string or array, trimmed, capped; control characters removed', () => {
  assert.deepEqual(validateTrip({ ...good(), stops: 'X\n\n Y ' }).value.stops, ['X', 'Y']);
  assert.equal(validateTrip({ ...good(), stops: Array(20).fill('s') }).value.stops.length, 8);
  assert.equal(validateTrip({ ...good(), pickup: 'Ah\u0000med' }).value.pickup, 'Ah med');
});
test('contact: Indian mobile normalised, bad ones rejected', () => {
  assert.equal(validateContact({ name: 'N', phone: '98765 43210' }).value.mobile, '+919876543210');
  assert.equal(validateContact({ name: 'N', phone: '+91-9876543210' }).ok, true);
  assert.ok(validateContact({ name: 'N', phone: '12345' }).errors.phone);
  assert.ok(validateContact({ name: '', phone: '9876543210' }).errors.name);
  assert.ok(validateContact({ name: 'N', phone: '9876543210', email: 'bad' }).errors.email);
});
test('quote lines validated; totals recomputed server-side; tax never invented', () => {
  assert.equal(validateLineItems([]).ok, false);
  assert.equal(validateLineItems([{ label: 'x', type: 'base', amountPaise: 10.5 }]).ok, false);
  assert.equal(validateLineItems([{ label: 'x', type: 'base', amountPaise: -5 }]).ok, false);
  assert.equal(validateLineItems([{ label: 'x', type: 'adjustment', amountPaise: -5 }]).ok, true);
  const items = [{ label: 'a', type: 'base', amountPaise: 100000 }, { label: 'b', type: 'approved_extra', amountPaise: 5000 }];
  assert.equal(totals(items, { tax: null }, undefined).totalPaise, 105000);
  assert.equal(totals(items, { tax: null }, 2000).taxSource, 'owner_manual');
  assert.equal(totals(items, { tax: { mode: 'percent', percent: 10 } }, 99999).taxPaise, 10500);
});
test('settings patch: unknown keys dropped, bad values rejected, null allowed', () => {
  const ok = validateSettingsPatch({ emptyReturn: null, tax: { mode: 'none' }, evil: 1, version: 99 });
  assert.equal(ok.ok, true); assert.equal('evil' in ok.patch, false); assert.equal('version' in ok.patch, false);
  assert.equal(validateSettingsPatch({ minimumFarePaise: 12.5 }).ok, false);
  assert.equal(validateSettingsPatch({ tax: { mode: 'percent', percent: 150 } }).ok, false);
  assert.equal(validateSettingsPatch({ emptyReturn: { mode: 'double' } }).ok, false);
  assert.equal(validateSettingsPatch({ vehicleCategories: [{ key: 'a' }, { key: 'a' }] }).ok, false);
});
test('interval overlap: touching is fine, overlapping is a conflict', () => {
  const d = (h) => new Date(2030, 0, 1, h);
  assert.equal(overlaps(d(8), d(12), d(12), d(14)), false); assert.equal(overlaps(d(8), d(12), d(11), d(14)), true); assert.equal(overlaps(d(8), d(12), d(9), d(10)), true);
});
