import { Route as RouteIcon, Timer, Wallet } from 'lucide-react';

const d = (x) => (x ? new Date(x + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const t = (x) => { if (!x) return ''; const [h, m] = x.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const inr = (n) => '\u20B9' + Number(n).toLocaleString('en-IN');

// estimate = response of getRouteEstimate(). Real numbers only ever come from the server.
export default function RouteSummary({ trip, estimate, loading }) {
  const data = estimate?.ok ? estimate.data : null;
  return (
    <section className="summary" aria-label="Route and estimate summary">
      <div className="summary-route">
        <span className="dot a" /><span className="line" /><span className="dot b" />
        <div><strong>{trip.pickup}</strong><span className="sub">to</span><strong>{trip.destination}</strong></div>
      </div>
      <dl className="facts">
        <div><dt>Trip type</dt><dd>{trip.tripType === 'round-trip' ? 'Round trip' : 'One-way'}</dd></div>
        <div><dt>Departure</dt><dd>{trip.date ? `${d(trip.date)}${trip.time ? ', ' + t(trip.time) : ''}` : <span className="pending">Not chosen yet</span>}</dd></div>
        {trip.tripType === 'round-trip' && <div><dt>Return</dt><dd>{trip.returnDate ? `${d(trip.returnDate)}${trip.returnTime ? ', ' + t(trip.returnTime) : ''}` : <span className="pending">Not chosen yet</span>}</dd></div>}
        <div><dt>Passengers</dt><dd>{trip.passengers}</dd></div>
        <div><dt><RouteIcon size={15} aria-hidden="true" /> Road distance</dt>
          <dd>{loading ? <span className="skel" /> : data?.distanceKm != null ? `${data.distanceKm} km` : <span className="pending">Shown once the route service is connected</span>}</dd></div>
        <div><dt><Timer size={15} aria-hidden="true" /> Estimated travel time</dt>
          <dd>{loading ? <span className="skel" /> : data?.durationMin != null ? `${Math.floor(data.durationMin / 60)} h ${data.durationMin % 60} min` : <span className="pending">Shown once the route service is connected</span>}</dd></div>
        <div><dt><Wallet size={15} aria-hidden="true" /> Estimated fare</dt>
          <dd>{loading ? <span className="skel" /> : data?.fareEstimate != null ? inr(data.fareEstimate) : <span className="pending">The owner will provide a quote</span>}</dd></div>
      </dl>
      <p className="summary-note">This is an estimate, not a quote. Distance and travel time describe the road, not the price. Tolls are not included.</p>
    </section>
  );
}
