// Server-side validation of what the browser sends. Anything not listed here (fare, distance, status, payment...)
// is simply ignored, so a browser can never push a price, distance or confirmation into the system.
const MOBILE = /^(\+91)?[6-9]\d{9}$/;
const clean = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');
const parseIst = (date, time) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) return null;
  const d = new Date(`${date}T${time}:00+05:30`); // customers enter India time
  return Number.isNaN(d.getTime()) ? null : d;
};

function validateTrip(trip, { now = new Date() } = {}) {
  const t = trip && typeof trip === 'object' ? trip : {};
  const errors = {};
  const tripType = t.tripType === 'round-trip' ? 'round-trip' : t.tripType === 'one-way' ? 'one-way' : null;
  if (!tripType) errors.tripType = 'Choose one-way or round trip.';
  const pickup = clean(t.pickup, 200), destination = clean(t.destination, 200);
  if (!pickup) errors.pickup = 'Pickup is required.';
  if (!destination) errors.destination = 'Destination is required.';
  else if (pickup && pickup.toLowerCase() === destination.toLowerCase()) errors.destination = 'Destination must differ from pickup.';
  const rawStops = Array.isArray(t.stops) ? t.stops : typeof t.stops === 'string' ? t.stops.split('\n') : [];
  const stops = rawStops.map((s) => clean(s, 200)).filter(Boolean).slice(0, 8);
  const departureAt = parseIst(t.date, t.time);
  if (!departureAt) errors.departure = 'A valid departure date and time are required.';
  else if (departureAt <= now) errors.departure = 'Departure must be in the future.';
  let returnAt = null;
  if (tripType === 'round-trip') {
    returnAt = parseIst(t.returnDate, t.returnTime);
    if (!returnAt) errors.return = 'A valid return date and time are required.';
    else if (departureAt && returnAt <= departureAt) errors.return = 'Return must be after departure.';
  }
  const passengers = Number(t.passengers);
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 20) errors.passengers = 'Passengers must be a whole number from 1 to 20.';
  return { ok: Object.keys(errors).length === 0, errors,
    value: { tripType, pickup, destination, stops, departureAt, returnAt, passengers, vehicleKey: clean(t.vehicle, 40).toLowerCase(), multiDay: t.multi === true, notes: clean(t.notes, 1000) } };
}

function validateContact(c) {
  const x = c && typeof c === 'object' ? c : {};
  const errors = {};
  const name = clean(x.name, 100), email = clean(x.email, 150).toLowerCase();
  const mobileRaw = clean(x.phone, 20).replace(/[\s-]/g, '');
  if (!name) errors.name = 'Name is required.';
  if (!MOBILE.test(mobileRaw)) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address or leave it blank.';
  return { ok: Object.keys(errors).length === 0, errors, value: { name, mobile: '+91' + mobileRaw.slice(-10), email, notes: clean(x.notes, 1000) } };
}
module.exports = { validateTrip, validateContact, parseIst };
