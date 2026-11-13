// Route facts come ONLY from here (server side). The Google key lives in server/.env and never reaches the browser.
// Google returns distance and drive time for a route. It does not return a taxi fare.
const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

async function googleLeg({ origin, destination, stops = [] }, { apiKey, fetchImpl = globalThis.fetch, timeoutMs = 8000 }) {
  const body = { origin: { address: origin }, destination: { address: destination }, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE', regionCode: 'IN', languageCode: 'en-IN' };
  if (stops.length) body.intermediates = stops.map((address) => ({ address }));
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(ENDPOINT, { method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration' }, body: JSON.stringify(body) });
    if (!res.ok) return { ok: false, reason: 'api_error', status: res.status };
    const data = await res.json();
    const r = data?.routes?.[0];
    if (!r || !Number.isFinite(r.distanceMeters)) return { ok: false, reason: 'no_route' };
    return { ok: true, distanceMeters: r.distanceMeters, durationSeconds: parseInt(String(r.duration || '0'), 10) || 0 };
  } catch (e) { return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : 'network' }; }
  finally { clearTimeout(timer); }
}

// trip: { pickup, destination, stops[], tripType }. Returns the route snapshot, or { ok:false, reason }.
async function getRoute(trip, { apiKey, fetchImpl } = {}) {
  if (!apiKey) return { ok: false, reason: 'not_configured' };
  const out = await googleLeg({ origin: trip.pickup, destination: trip.destination, stops: trip.stops }, { apiKey, fetchImpl });
  if (!out.ok) return out;
  let ret = null;
  if (trip.tripType === 'round-trip') {
    ret = await googleLeg({ origin: trip.destination, destination: trip.pickup, stops: [...trip.stops].reverse() }, { apiKey, fetchImpl });
    if (!ret.ok) return ret;
  }
  return { ok: true, source: 'google', provider: 'google_routes', fetchedAt: new Date(), outboundMeters: out.distanceMeters, returnMeters: ret ? ret.distanceMeters : null,
    durationSeconds: out.durationSeconds + (ret ? ret.durationSeconds : 0) };
}
module.exports = { getRoute, googleLeg };
