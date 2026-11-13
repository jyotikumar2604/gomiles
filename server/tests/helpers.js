// TEST FIXTURES ONLY. The rates below are fake numbers so the arithmetic can be checked. They are not real prices.
const futureDate = (days) => new Date(Date.now() + days * 864e5 + 330 * 60000).toISOString().slice(0, 10);
// Every optional owner decision is explicit (0 / "none"), so the estimate can be 'complete'.
const completeSettings = (over = {}) => ({
  version: 3, maxOneWayKm: 1000, maxDistanceConfirmed: true, distanceLimitAppliesTo: 'perLeg', minDistanceKm: null, outOfRangeBehaviour: 'manual_review',
  roundTripBilling: 'sum_of_legs',
  vehicleCategories: [{ key: 'sedan', label: 'Sedan', seats: 4, ratePerKmPaise: 1000, active: true }, { key: 'suv', label: 'SUV', seats: 6, ratePerKmPaise: null, active: true }],
  driverAllowancePerDayPaise: 0, driverAllowanceMode: 'multi_day_only', overnightChargePerNightPaise: 0, extraStopChargePaise: 0, waitingChargePerHourPaise: 0,
  minimumFarePaise: null, passengerSurcharge: null, emptyReturn: { mode: 'none' }, tax: { mode: 'none' }, manualReview: { multiStop: true, multiDay: true }, ...over,
});
const km = (n) => n * 1000;
const input = (over = {}) => ({ tripType: 'one-way', categoryKey: 'sedan', passengers: 3, stopsCount: 0, multiDayFlag: false,
  departureAt: new Date('2030-01-10T04:30:00Z'), returnAt: null, route: { outboundMeters: km(200), returnMeters: null, durationSeconds: 9000 }, ...over });
const fakeRes = () => { const r = { code: 200, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
module.exports = { futureDate, completeSettings, km, input, fakeRes };
