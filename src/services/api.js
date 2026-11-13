// All server communication lives here. The Express backend does not exist yet:
// while VITE_API_URL is empty every call resolves to { ok:false, reason:'not_configured' }
// and the UI says so honestly instead of faking success.
//
// Expected contract (to be built later, server-side only):
//  POST /api/route-estimate  -> { distanceKm, durationMin, fareEstimate|null, estimate, ... }  (computed on the server; see server/docs/BACKEND_PLAN.md)
//  POST /api/trip-requests   -> { reference, trackingToken }  (a request, never a confirmed booking)
//  GET  /api/bookings/:ref?token=  -> { ref, status, route, tripType, date, passengers, quote|null, payment:null }
//  POST /api/contact, POST /api/auth/login
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const isBackendConfigured = Boolean(BASE);

async function call(path, { method = 'GET', body } = {}) {
  if (!BASE) return { ok: false, reason: 'not_configured' };
  try {
    const r = await fetch(BASE + path, {
      method, credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => null);
    return r.ok ? { ok: true, data } : { ok: false, reason: 'server_error', status: r.status, data };
  } catch { return { ok: false, reason: 'network' }; }
}

export const getRouteEstimate = (p) => call('/api/route-estimate', { method: 'POST', body: p });
export const submitTripRequest = (p) => call('/api/trip-requests', { method: 'POST', body: p });
// The tracking code is shown once when a request is submitted; without it the server answers 404.
export const getBooking = (ref, token) => call(`/api/bookings/${encodeURIComponent(ref)}?token=${encodeURIComponent(token || '')}`);
export const getVehicleCategories = () => call('/api/vehicle-categories');
export const respondToQuote = (ref, token, action) => call(`/api/bookings/${encodeURIComponent(ref)}/quote-response`, { method: 'POST', body: { token, action } });
export const sendContact = (p) => call('/api/contact', { method: 'POST', body: p });
export const login = (p) => call('/api/auth/login', { method: 'POST', body: p });

export const reasonText = (res, what = 'This action') =>
  res.reason === 'not_configured' ? `${what} is not available yet because the backend is not connected. Nothing was sent.`
  : res.reason === 'network' ? 'Could not reach the server. Check your connection and try again.'
  : 'The server could not complete this. Try again in a moment.';
