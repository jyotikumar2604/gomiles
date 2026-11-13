// Checks the owner's settings patch before it is saved. null is always allowed (= "not decided").
const isInt = (v) => Number.isInteger(v) && v >= 0 && v <= 1e9;
const pct = (v) => typeof v === 'number' && v >= 0 && v <= 100;
const ALLOWED = ['maxOneWayKm', 'maxDistanceConfirmed', 'distanceLimitAppliesTo', 'minDistanceKm', 'outOfRangeBehaviour', 'roundTripBilling',
  'vehicleCategories', 'driverAllowancePerDayPaise', 'driverAllowanceMode', 'overnightChargePerNightPaise', 'extraStopChargePaise',
  'waitingChargePerHourPaise', 'minimumFarePaise', 'passengerSurcharge', 'emptyReturn', 'tax', 'manualReview', 'quoteValidityHours'];

function validateSettingsPatch(p) {
  const errors = [];
  if (!p || typeof p !== 'object' || Array.isArray(p)) return { ok: false, errors: ['Body must be an object.'], patch: {} };
  const patch = {};
  for (const k of ALLOWED) if (k in p) patch[k] = p[k];
  for (const k of ['driverAllowancePerDayPaise', 'overnightChargePerNightPaise', 'extraStopChargePaise', 'waitingChargePerHourPaise', 'minimumFarePaise'])
    if (k in patch && patch[k] !== null && !isInt(patch[k])) errors.push(`${k} must be null or a whole number of paise.`);
  const er = patch.emptyReturn;
  if ('emptyReturn' in patch && er !== null && !(er && (er.mode === 'none' || er.mode === 'manual' || (er.mode === 'percent_of_base' && pct(er.percent))))) errors.push('emptyReturn must be null, {mode:"none"}, {mode:"manual"} or {mode:"percent_of_base", percent:0-100}.');
  const tx = patch.tax;
  if ('tax' in patch && tx !== null && !(tx && (tx.mode === 'none' || (tx.mode === 'percent' && pct(tx.percent))))) errors.push('tax must be null, {mode:"none"} or {mode:"percent", percent:0-100, label}.');
  const ps = patch.passengerSurcharge;
  if ('passengerSurcharge' in patch && ps !== null && !(ps && isInt(ps.freeUpTo) && isInt(ps.perExtraPassengerPaise))) errors.push('passengerSurcharge must be null or {freeUpTo, perExtraPassengerPaise}.');
  if ('vehicleCategories' in patch) {
    const cats = patch.vehicleCategories;
    if (!Array.isArray(cats) || new Set(cats.map((c) => c?.key)).size !== cats.length) errors.push('vehicleCategories must be an array with unique keys.');
    else for (const c of cats) { if (c.ratePerKmPaise != null && !isInt(c.ratePerKmPaise)) errors.push(`Rate for ${c.key} must be null or whole paise per km.`); if (c.seats != null && !(Number.isInteger(c.seats) && c.seats >= 1)) errors.push(`Seats for ${c.key} must be null or 1 or more.`); }
  }
  if ('roundTripBilling' in patch && ![null, 'sum_of_legs'].includes(patch.roundTripBilling)) errors.push('roundTripBilling must be null or "sum_of_legs".');
  return { ok: errors.length === 0, errors, patch };
}
module.exports = { validateSettingsPatch, ALLOWED };
