// PRICING ENGINE. Pure functions: no database, no network, no Express. That makes it easy to read and test.
//
// What it does: turns TRUSTED route facts + the owner's settings into an ESTIMATE (never a quote, never a booking).
//   base fare = billable road metres x category rate per km  (rate is owner-configured, per vehicle category)
//   + only the extra charges the owner has approved  + tax only if the owner has set a tax rule.
// Google Maps gives distance. It does not give a price. Travel TIME is never used in the fare.
//
// Settings convention:  null = owner has not decided   |   0 = owner decided "no charge"   |  >0 = approved amount.
// Money is integer paise. Tolls are never included.
const { TOLLS_TEXT, ESTIMATE_TEXT } = require('../constants');

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const reason = (code, message) => ({ code, message });
const istDay = (d) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10); // India date (UTC+5:30)
const calendarDays = (dep, ret) => (ret ? Math.max(1, Math.round((Date.parse(istDay(ret)) - Date.parse(istDay(dep))) / 864e5) + 1) : 1);
const km1 = (m) => Math.round(m / 100) / 10;
const rupees = (paise) => (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0 });

function unavailable(reasons, extra = {}) {
  return { status: 'unavailable', isEstimate: true, binding: false, action: 'manual_review', reasons, lines: [], excluded: [], warnings: [],
    notes: [ESTIMATE_TEXT, TOLLS_TEXT], ...extra };
}

/**
 * input: { tripType, categoryKey, passengers, stopsCount, multiDayFlag, departureAt: Date, returnAt: Date|null,
 *          route: { outboundMeters, returnMeters|null } }   (route must come from the server, never the browser)
 * returns an object whose status is 'complete' | 'partial' | 'unavailable'.
 *   complete    = every needed rule was configured (still only an estimate)
 *   partial     = some owner decisions are missing; listed in `excluded`; no fare number should be shown to the customer
 *   unavailable = cannot estimate; `reasons` says why; the owner reviews by hand
 */
function estimateTrip(input, s) {
  if (!s) return unavailable([reason('NO_SETTINGS', 'Pricing settings have not been created yet.')]);
  const route = input.route;
  const round = input.tripType === 'round-trip';
  if (!route || !isNum(route.outboundMeters) || route.outboundMeters <= 0) return unavailable([reason('ROUTE_UNAVAILABLE', 'A trusted road distance is not available.')]);
  if (round && !(isNum(route.returnMeters) && route.returnMeters > 0)) return unavailable([reason('ROUTE_UNAVAILABLE', 'The return-leg distance is not available.')]);
  if (!input.categoryKey) return unavailable([reason('CATEGORY_NOT_CHOSEN', 'No vehicle category was chosen.')]);
  const cat = (s.vehicleCategories || []).find((c) => c.active !== false && c.key === input.categoryKey);
  if (!cat) return unavailable([reason('CATEGORY_UNKNOWN', 'That vehicle category is not offered.')]);

  const warnings = [];
  if (isNum(cat.seats)) {
    if (input.passengers > cat.seats) return unavailable([reason('CAPACITY_EXCEEDED', `This category seats ${cat.seats}; ${input.passengers} passengers were requested.`)]);
  } else warnings.push(reason('CAPACITY_NOT_VERIFIED', 'Seat capacity for this category is not set, so capacity was not checked.'));
  if (!isNum(cat.ratePerKmPaise)) return unavailable([reason('RATE_NOT_SET', 'The owner has not set a rate per km for this category.')]);

  // Distance limits (configurable; the 1,000 km value is provisional until the owner approves it)
  const outKm = route.outboundMeters / 1000, retKm = round ? route.returnMeters / 1000 : 0, totalKm = outKm + retKm;
  if (!s.maxDistanceConfirmed) warnings.push(reason('LIMIT_PROVISIONAL', 'The maximum distance is a provisional working value awaiting owner approval.'));
  if (s.distanceLimitAppliesTo == null) warnings.push(reason('LIMIT_SCOPE_UNCONFIRMED', 'It is not decided whether the limit applies per leg or to the whole round trip; per leg was used.'));
  if (isNum(s.maxOneWayKm)) {
    const over = s.distanceLimitAppliesTo === 'roundTripTotal' ? totalKm > s.maxOneWayKm : Math.max(outKm, retKm) > s.maxOneWayKm;
    if (over) {
      if (s.outOfRangeBehaviour == null) warnings.push(reason('OUT_OF_RANGE_POLICY_UNSET', 'No out-of-range behaviour is configured; sent to manual review rather than rejected.'));
      return unavailable([reason('OUT_OF_RANGE', `The route is longer than the configured limit of ${s.maxOneWayKm} km.`)], { action: s.outOfRangeBehaviour === 'block' ? 'block' : 'manual_review', warnings });
    }
  }
  if (isNum(s.minDistanceKm) && totalKm < s.minDistanceKm) return unavailable([reason('BELOW_MINIMUM_DISTANCE', `The route is shorter than the configured minimum of ${s.minDistanceKm} km.`)], { warnings });

  // Billable distance. Round-trip billing is an open owner decision, so without a setting we do not guess.
  let billableMeters = route.outboundMeters;
  if (round) {
    if (s.roundTripBilling !== 'sum_of_legs') return unavailable([reason('ROUND_TRIP_BILLING_UNSET', 'The owner has not decided how round trips are billed.')], { warnings });
    billableMeters = route.outboundMeters + route.returnMeters;
  }

  const lines = [], excluded = [];
  const baseFare = Math.round((billableMeters * cat.ratePerKmPaise) / 1000); // integer paise
  lines.push({ code: 'BASE_FARE', label: `Road distance ${km1(billableMeters)} km at \u20B9${rupees(cat.ratePerKmPaise)}/km`, amountPaise: baseFare, type: 'base' });

  // Empty return: only for one-way trips, only if the owner chose a rule. Never automatic doubling.
  if (!round) {
    const er = s.emptyReturn;
    if (er == null) excluded.push({ code: 'EMPTY_RETURN_UNRESOLVED', message: 'The empty-return policy is not decided.', blocking: true });
    else if (er.mode === 'percent_of_base' && isNum(er.percent)) lines.push({ code: 'EMPTY_RETURN', label: `Empty-return charge (${er.percent}% of base fare)`, amountPaise: Math.round((baseFare * er.percent) / 100), type: 'approved_extra' });
    else if (er.mode === 'manual') excluded.push({ code: 'EMPTY_RETURN_MANUAL', message: 'The owner prices the empty return case by case.', blocking: true });
  }

  const days = round ? calendarDays(input.departureAt, input.returnAt) : 1;
  const nights = Math.max(0, days - 1);
  const multiDay = days > 1 || !!input.multiDayFlag;
  if (input.multiDayFlag && days === 1) excluded.push({ code: 'MULTI_DAY_LENGTH_UNKNOWN', message: 'The number of days was not given; the owner will confirm it.', blocking: true });

  if (multiDay || s.driverAllowanceMode === 'every_day') {
    if (isNum(s.driverAllowancePerDayPaise) && s.driverAllowanceMode) {
      const applies = s.driverAllowanceMode === 'every_day' || multiDay;
      if (applies && s.driverAllowancePerDayPaise > 0) lines.push({ code: 'DRIVER_ALLOWANCE', label: `Driver allowance, ${days} day(s)`, amountPaise: s.driverAllowancePerDayPaise * days, type: 'approved_extra' });
    } else excluded.push({ code: 'DRIVER_ALLOWANCE_UNSET', message: 'The driver allowance policy is not decided.', blocking: true });
  }
  if (nights > 0) {
    if (isNum(s.overnightChargePerNightPaise)) { if (s.overnightChargePerNightPaise > 0) lines.push({ code: 'OVERNIGHT', label: `Overnight charge, ${nights} night(s)`, amountPaise: s.overnightChargePerNightPaise * nights, type: 'approved_extra' }); }
    else excluded.push({ code: 'OVERNIGHT_CHARGE_UNSET', message: 'The overnight charge is not decided.', blocking: true });
  }
  const stops = input.stopsCount || 0;
  if (stops > 0) {
    if (isNum(s.extraStopChargePaise)) { if (s.extraStopChargePaise > 0) lines.push({ code: 'EXTRA_STOPS', label: `Extra stops x ${stops}`, amountPaise: s.extraStopChargePaise * stops, type: 'approved_extra' }); }
    else excluded.push({ code: 'EXTRA_STOP_CHARGE_UNSET', message: 'The charge for extra stops is not decided.', blocking: true });
  }
  const ps = s.passengerSurcharge;
  if (ps && isNum(ps.freeUpTo) && isNum(ps.perExtraPassengerPaise) && input.passengers > ps.freeUpTo)
    lines.push({ code: 'PASSENGER_SURCHARGE', label: `Extra passengers x ${input.passengers - ps.freeUpTo}`, amountPaise: (input.passengers - ps.freeUpTo) * ps.perExtraPassengerPaise, type: 'approved_extra' });
  excluded.push({ code: 'WAITING_NOT_ESTIMATED', message: 'Waiting time is unknown in advance; the owner adds it to the quote if it applies.', blocking: false });

  let subtotalPaise = lines.reduce((t, l) => t + l.amountPaise, 0);
  if (isNum(s.minimumFarePaise) && subtotalPaise < s.minimumFarePaise) {
    lines.push({ code: 'MINIMUM_FARE_ADJUSTMENT', label: 'Adjustment to minimum fare', amountPaise: s.minimumFarePaise - subtotalPaise, type: 'adjustment' });
    subtotalPaise = s.minimumFarePaise;
  }
  let taxPaise = 0, taxLabel = null;
  if (s.tax == null) excluded.push({ code: 'TAX_UNRESOLVED', message: 'The tax treatment is not decided.', blocking: true });
  else if (s.tax.mode === 'percent' && isNum(s.tax.percent)) { taxPaise = Math.round((subtotalPaise * s.tax.percent) / 100); taxLabel = `${s.tax.label || 'Tax'} (${s.tax.percent}%)`; }

  const reviewReasons = [];
  if (stops > 0 && (s.manualReview || {}).multiStop !== false) reviewReasons.push('MULTI_STOP');
  if (multiDay && (s.manualReview || {}).multiDay !== false) reviewReasons.push('MULTI_DAY');

  const partial = excluded.some((e) => e.blocking);
  return {
    status: partial ? 'partial' : 'complete', isEstimate: true, binding: false, action: null, reasons: [], warnings,
    category: { key: cat.key, label: cat.label, seats: cat.seats ?? null },
    billableMeters, days, nights, lines, subtotalPaise, taxPaise, taxLabel, totalPaise: subtotalPaise + taxPaise,
    excluded, manualReviewReasons: reviewReasons, notes: [ESTIMATE_TEXT, TOLLS_TEXT],
    rulesSnapshot: { settingsVersion: s.version, categoryKey: cat.key, ratePerKmPaise: cat.ratePerKmPaise, roundTripBilling: s.roundTripBilling ?? null,
      emptyReturn: s.emptyReturn ?? null, tax: s.tax ?? null, minimumFarePaise: s.minimumFarePaise ?? null, maxOneWayKm: s.maxOneWayKm ?? null,
      maxDistanceConfirmed: !!s.maxDistanceConfirmed, distanceLimitAppliesTo: s.distanceLimitAppliesTo ?? null },
  };
}

// Which owner decisions are still open? Used for the owner settings screen and honest warnings.
function listUnresolvedPolicies(s) {
  const u = [];
  const add = (code, label) => u.push({ code, label });
  if (!s) return [{ code: 'NO_SETTINGS', label: 'No pricing settings exist yet.' }];
  if (!s.maxDistanceConfirmed) add('MAX_DISTANCE_UNCONFIRMED', 'Maximum distance (1,000 km working value) not approved');
  if (s.distanceLimitAppliesTo == null) add('DISTANCE_LIMIT_SCOPE', 'Limit per leg or per round trip not decided');
  if (s.minDistanceKm == null) add('MIN_DISTANCE', 'Minimum distance not decided');
  if (s.outOfRangeBehaviour == null) add('OUT_OF_RANGE', 'Out-of-range behaviour not decided');
  if (s.roundTripBilling == null) add('ROUND_TRIP_BILLING', 'Round-trip billing not decided');
  if (!(s.vehicleCategories || []).length) add('NO_CATEGORIES', 'No vehicle categories configured');
  for (const c of s.vehicleCategories || []) { if (c.ratePerKmPaise == null) add('RATE_' + c.key, `Rate per km not set for ${c.label}`); if (c.seats == null) add('SEATS_' + c.key, `Seat capacity not set for ${c.label}`); }
  if (s.emptyReturn == null) add('EMPTY_RETURN', 'Empty-return policy not decided');
  if (s.tax == null) add('TAX', 'Tax treatment not decided');
  if (s.driverAllowancePerDayPaise == null || s.driverAllowanceMode == null) add('DRIVER_ALLOWANCE', 'Driver allowance not decided');
  if (s.overnightChargePerNightPaise == null) add('OVERNIGHT', 'Overnight charge not decided');
  if (s.extraStopChargePaise == null) add('EXTRA_STOP', 'Extra-stop charge not decided');
  if (s.waitingChargePerHourPaise == null) add('WAITING', 'Waiting charge not decided');
  if (s.minimumFarePaise == null) add('MIN_FARE', 'Minimum fare not decided');
  if (s.quoteValidityHours == null) add('QUOTE_VALIDITY', 'Quote validity not decided');
  return u;
}
module.exports = { estimateTrip, listUnresolvedPolicies, calendarDays };
