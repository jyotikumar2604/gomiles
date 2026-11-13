import { useState } from 'react';
import { Search } from 'lucide-react';
import { Field } from '../components/TripFields.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import PageHero from '../components/PageHero.jsx';
import { Alert } from '../components/UI.jsx';
import { getBooking, reasonText } from '../services/api.js';
import { DEMO_BOOKINGS } from '../data/demoData.js';

// Stages shown for a booking. 'at' = index of the current stage for each status. A stage is never shown
// as done unless the booking data says it happened (no assumed confirmation or assignment).
const STAGES = ['Request submitted', 'Under owner review', 'Quote received', 'Awaiting your acceptance', 'Awaiting advance payment', 'Confirmed', 'Trip in progress', 'Completed'];
const AT = { pending: 1, quoted: 3, accepted: 4, confirmed: 5, active: 6, completed: 8 };
const NEXT = {
  pending: 'The owner is reviewing your request. The quote will appear here when it is ready.',
  quoted: 'Read the quote, then accept or decline it.',
  accepted: 'Pay the advance to secure your booking. It is confirmed only after payment is verified.',
  confirmed: 'Your booking is confirmed. Vehicle and driver details appear here once the owner assigns them.',
  active: 'Your trip is in progress.', completed: 'Your trip is complete. Any balance is settled with the owner.',
  cancelled: 'This booking was cancelled. Refund steps depend on the owner\u2019s policy.',
};

export default function BookingStatus() {
  const [ref, setRef] = useState('');
  const [token, setToken] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [booking, setBooking] = useState(null);
  const [demo, setDemo] = useState(false);

  const find = async (e) => {
    e.preventDefault(); setMsg(null); setBooking(null); setDemo(false);
    if (!ref.trim() || !token.trim()) { setErr('Enter your booking reference and tracking code.'); return; }
    setErr(''); setBusy(true);
    const r = await getBooking(ref.trim(), token.trim());
    setBusy(false);
    if (r.ok) setBooking(r.data); else setMsg(reasonText(r, 'Booking lookup'));
  };
  const show = (b) => { setBooking(b); setDemo(true); setMsg(null); };
  const b = booking;
  const cur = b ? AT[b.status] ?? 0 : 0;

  return (
    <div className="wrap page">
      <PageHero title="Booking status" lead="Follow your request from review to confirmation. Each step appears only when it has actually happened." />
      <div className="split">
        <div className="stack">
          <form onSubmit={find} noValidate className="card-form inline-form">
            <Field id="ref" label="Booking reference" icon={Search} error={err}>
              <input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reference from your confirmation" aria-invalid={err ? true : undefined} aria-describedby={err ? 'ref-err' : undefined} />
            </Field>
            <Field id="token" label="Tracking code" icon={Search}>
              <input id="token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Shown once when you sent the request" autoComplete="off" />
            </Field>
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Looking up\u2026' : 'Find booking'}</button>
          </form>
          {msg && <Alert tone="error" title="Could not look up booking">{msg}</Alert>}
          {!b && !msg && <p className="muted">Enter the reference from your confirmation message.</p>}
          {b && (
            <section className="card" aria-label="Booking details">
              {demo && <Alert title="Demo data">This is a sample booking to show the layout. It is not a real booking.</Alert>}
              <div className="card-h"><h2>{b.ref}</h2><StatusBadge status={b.status} /></div>
              <p className="trip-line"><strong>{b.route}</strong><span>{b.tripType}, {b.date}, {b.passengers} passengers</span></p>
              {b.status !== 'cancelled' && (
                <ol className="stages">{STAGES.map((s, i) => (
                  <li key={s} className={i < cur ? 'done' : i === cur ? 'cur' : ''} aria-current={i === cur ? 'step' : undefined}>{s}</li>))}</ol>
              )}
              <dl className="facts plain">
                <div><dt>Quote</dt><dd className="pending">Quote details appear here once the owner issues one.</dd></div>
                <div><dt>Payment</dt><dd className="pending">Payment status appears here once the payment gateway is connected.</dd></div>
              </dl>
              <p className="next"><strong>What happens next.</strong> {NEXT[b.status]}</p>
            </section>
          )}
        </div>
        <aside className="aside">
          <h2 className="h-sm">Preview the layout</h2>
          <p className="muted">Real lookups need the backend. These demo bookings show each stage.</p>
          <ul className="plain-list">
            {DEMO_BOOKINGS.filter((x) => x.status !== 'cancelled').map((x) => (
              <li key={x.ref}><button className="link" onClick={() => show(x)}>{x.ref}</button> <StatusBadge status={x.status} /></li>))}
            <li><button className="link" onClick={() => show(DEMO_BOOKINGS.find((x) => x.status === 'cancelled'))}>DEMO-008</button> <StatusBadge status="cancelled" /></li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
