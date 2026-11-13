const test = require('node:test'); const assert = require('node:assert/strict');
const { estimateTrip, listUnresolvedPolicies } = require('../src/services/pricingEngine');
const { completeSettings: S, km, input } = require('./helpers');
const codes = (e) => e.excluded.map((x) => x.code);

test('no settings -> unavailable, no numbers', () => { const e = estimateTrip(input(), null); assert.equal(e.status, 'unavailable'); assert.equal(e.reasons[0].code, 'NO_SETTINGS'); assert.equal(e.totalPaise, undefined); });
test('rate not set -> unavailable (never invents a price)', () => { const e = estimateTrip(input({ categoryKey: 'suv' }), S()); assert.equal(e.status, 'unavailable'); assert.equal(e.reasons[0].code, 'RATE_NOT_SET'); assert.equal(e.lines.length, 0); });
test('one-way: distance x rate, complete, never binding, tolls excluded', () => {
  const e = estimateTrip(input(), S());
  assert.equal(e.status, 'complete'); assert.equal(e.lines[0].amountPaise, 200000); assert.equal(e.totalPaise, 200000);
  assert.equal(e.binding, false); assert.equal(e.isEstimate, true); assert.ok(e.notes.some((n) => /Tolls are not included/.test(n)));
});
test('travel time never changes the fare', () => {
  const a = estimateTrip(input({ route: { outboundMeters: km(200), durationSeconds: 100 } }), S());
  const b = estimateTrip(input({ route: { outboundMeters: km(200), durationSeconds: 999999 } }), S());
  assert.equal(a.totalPaise, b.totalPaise);
});
test('empty return undecided -> partial, NOT doubled', () => {
  const e = estimateTrip(input(), S({ emptyReturn: null }));
  assert.equal(e.status, 'partial'); assert.ok(codes(e).includes('EMPTY_RETURN_UNRESOLVED')); assert.equal(e.totalPaise, 200000);
});
test('empty return only when owner sets a percent rule', () => {
  const e = estimateTrip(input(), S({ emptyReturn: { mode: 'percent_of_base', percent: 50 } }));
  assert.equal(e.lines.find((l) => l.code === 'EMPTY_RETURN').amountPaise, 100000); assert.equal(e.totalPaise, 300000);
});
test('round trip needs a billing rule; with sum_of_legs both legs are billed', () => {
  const rt = input({ tripType: 'round-trip', returnAt: new Date('2030-01-10T14:00:00Z'), route: { outboundMeters: km(200), returnMeters: km(210), durationSeconds: 1 } });
  assert.equal(estimateTrip(rt, S({ roundTripBilling: null })).reasons[0].code, 'ROUND_TRIP_BILLING_UNSET');
  const e = estimateTrip(rt, S()); assert.equal(e.billableMeters, km(410)); assert.equal(e.totalPaise, 410000); assert.equal(e.status, 'complete');
});
test('out of range: manual review by default, block when owner says so, provisional limit warned', () => {
  const far = input({ route: { outboundMeters: km(1001) } });
  const a = estimateTrip(far, S({ maxDistanceConfirmed: false, outOfRangeBehaviour: null }));
  assert.equal(a.status, 'unavailable'); assert.equal(a.reasons[0].code, 'OUT_OF_RANGE'); assert.equal(a.action, 'manual_review');
  assert.ok(a.warnings.some((w) => w.code === 'LIMIT_PROVISIONAL')); assert.ok(a.warnings.some((w) => w.code === 'OUT_OF_RANGE_POLICY_UNSET'));
  assert.equal(estimateTrip(far, S({ outOfRangeBehaviour: 'block' })).action, 'block');
  assert.equal(estimateTrip(input({ route: { outboundMeters: km(1000) } }), S()).status, 'complete'); // exactly at the limit is allowed
});
test('limit scope: 600+600 km passes per leg but fails as a round-trip total', () => {
  const rt = input({ tripType: 'round-trip', returnAt: new Date('2030-01-11T04:30:00Z'), route: { outboundMeters: km(600), returnMeters: km(600) } });
  assert.notEqual(estimateTrip(rt, S({ distanceLimitAppliesTo: 'perLeg' })).reasons[0]?.code, 'OUT_OF_RANGE');
  assert.equal(estimateTrip(rt, S({ distanceLimitAppliesTo: 'roundTripTotal' })).reasons[0].code, 'OUT_OF_RANGE');
});
test('capacity is validated, not priced', () => { const e = estimateTrip(input({ passengers: 5 }), S()); assert.equal(e.reasons[0].code, 'CAPACITY_EXCEEDED'); });
test('unknown or inactive category', () => {
  assert.equal(estimateTrip(input({ categoryKey: 'nope' }), S()).reasons[0].code, 'CATEGORY_UNKNOWN');
  assert.equal(estimateTrip(input(), S({ vehicleCategories: [{ key: 'sedan', label: 'Sedan', seats: 4, ratePerKmPaise: 1000, active: false }] })).reasons[0].code, 'CATEGORY_UNKNOWN');
});
test('multi-day: unset overnight/allowance -> partial; set -> priced per day/night', () => {
  const md = input({ tripType: 'round-trip', departureAt: new Date('2030-01-10T04:30:00Z'), returnAt: new Date('2030-01-12T10:00:00Z'), route: { outboundMeters: km(100), returnMeters: km(100) } });
  const u = estimateTrip(md, S({ overnightChargePerNightPaise: null, driverAllowancePerDayPaise: null, driverAllowanceMode: null }));
  assert.equal(u.status, 'partial'); assert.ok(codes(u).includes('OVERNIGHT_CHARGE_UNSET')); assert.ok(codes(u).includes('DRIVER_ALLOWANCE_UNSET')); assert.ok(u.manualReviewReasons.includes('MULTI_DAY'));
  const p = estimateTrip(md, S({ overnightChargePerNightPaise: 50000, driverAllowancePerDayPaise: 30000 }));
  assert.equal(p.days, 3); assert.equal(p.nights, 2);
  assert.equal(p.lines.find((l) => l.code === 'OVERNIGHT').amountPaise, 100000); assert.equal(p.lines.find((l) => l.code === 'DRIVER_ALLOWANCE').amountPaise, 90000);
});
test('null means undecided, 0 means no charge (extra stops)', () => {
  const two = input({ stopsCount: 2 });
  const n = estimateTrip(two, S({ extraStopChargePaise: null })); assert.equal(n.status, 'partial'); assert.ok(n.manualReviewReasons.includes('MULTI_STOP'));
  const z = estimateTrip(two, S({ extraStopChargePaise: 0 })); assert.equal(z.status, 'complete'); assert.equal(z.lines.length, 1);
  assert.equal(estimateTrip(two, S({ extraStopChargePaise: 20000 })).lines.find((l) => l.code === 'EXTRA_STOPS').amountPaise, 40000);
});
test('minimum fare lifts a short trip; tax is separate and only from the owner rule', () => {
  const short = input({ route: { outboundMeters: km(10) } });
  const m = estimateTrip(short, S({ minimumFarePaise: 50000 })); assert.equal(m.subtotalPaise, 50000);
  const t = estimateTrip(input(), S({ tax: { mode: 'percent', percent: 5, label: 'TEST TAX' } })); assert.equal(t.taxPaise, 10000); assert.equal(t.totalPaise, 210000);
  assert.equal(estimateTrip(input(), S({ tax: null })).status, 'partial');
});
test('money stays whole paise', () => { const e = estimateTrip(input({ route: { outboundMeters: 12345 } }), S({ vehicleCategories: [{ key: 'sedan', label: 'Sedan', seats: 4, ratePerKmPaise: 1050 }] })); assert.ok(Number.isInteger(e.totalPaise)); assert.equal(e.lines[0].amountPaise, 12962); });
test('rules snapshot records what was used', () => { const e = estimateTrip(input(), S()); assert.equal(e.rulesSnapshot.settingsVersion, 3); assert.equal(e.rulesSnapshot.ratePerKmPaise, 1000); });
test('unresolved-policy list is honest for empty settings', () => {
  const u = listUnresolvedPolicies({ vehicleCategories: [{ key: 'sedan', label: 'Sedan', ratePerKmPaise: null, seats: null }] }).map((x) => x.code);
  for (const c of ['MAX_DISTANCE_UNCONFIRMED', 'EMPTY_RETURN', 'TAX', 'ROUND_TRIP_BILLING', 'RATE_sedan', 'QUOTE_VALIDITY']) assert.ok(u.includes(c), c);
  assert.equal(listUnresolvedPolicies(S({ maxDistanceConfirmed: true })).some((x) => x.code === 'MAX_DISTANCE_UNCONFIRMED'), false);
});
