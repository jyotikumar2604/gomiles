import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Inbox, Receipt, Route as RouteIcon, Car, UserRound, CalendarRange, Wallet, Undo2, BarChart3, Settings, Search, Menu, X } from 'lucide-react';
import StatusBadge, { STATUS_LABELS } from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import { Alert, EmptyState } from '../components/UI.jsx';
import { DEMO_BOOKINGS, DEMO_VEHICLES, DEMO_DRIVERS } from '../data/demoData.js';
import { BRAND } from '../config.js';

// Each booking view is a preset of statuses; the filter dropdown narrows within it.
const NAV = [
  ['overview', 'Overview', LayoutDashboard], ['requests', 'Booking requests', Inbox, ['pending', 'quoted', 'accepted', 'confirmed', 'active', 'completed', 'cancelled']],
  ['quotes', 'Quote management', Receipt, ['quoted', 'accepted']], ['trips', 'Upcoming trips', RouteIcon, ['confirmed', 'active']],
  ['fleet', 'Vehicles', Car], ['drivers', 'Drivers', UserRound], ['calendar', 'Reservations', CalendarRange],
  ['payments', 'Payments and balances', Wallet], ['refunds', 'Cancellations and refunds', Undo2, ['cancelled']],
  ['reports', 'Reports', BarChart3], ['settings', 'Settings', Settings],
];
const COUNTS = [['pending', 'Requests to review'], ['quoted', 'Quotes awaiting reply'], ['accepted', 'Accepted, awaiting payment'], ['confirmed', 'Confirmed'], ['active', 'In progress'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];

function Calendar({ onPick }) {
  const [off, setOff] = useState(0);
  const start = new Date('2026-10-26T00:00:00'); start.setDate(start.getDate() + off * 14);
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return (<div className="cal">
    <div className="cal-h"><button className="btn btn-secondary btn-sm" onClick={() => setOff(off - 1)}>Previous 2 weeks</button>
      <strong>{days[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to {days[13].toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
      <button className="btn btn-secondary btn-sm" onClick={() => setOff(off + 1)}>Next 2 weeks</button></div>
    <p className="muted">Demo bookings by departure date. Vehicle and driver rows arrive with real reservations.</p>
    <div className="cal-grid" role="grid">{days.map((d) => (
      <div key={key(d)} className="cal-day" role="gridcell"><span className="cal-n">{d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</span>
        {DEMO_BOOKINGS.filter((b) => b.date === key(d)).map((b) => <button key={b.ref} className={'chip s-' + b.status} onClick={() => onPick(b)}>{b.ref}: {b.route.split(' to ')[0]}</button>)}</div>))}</div>
  </div>);
}

export default function Dashboard() {
  const [view, setView] = useState('overview');
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [sel, setSel] = useState(null);
  const item = NAV.find((n) => n[0] === view);
  const go = (k) => { setView(k); setStatus('all'); setQ(''); setOpen(false); };

  const rows = useMemo(() => {
    const allowed = item?.[3];
    if (!allowed) return [];
    return DEMO_BOOKINGS.filter((b) => allowed.includes(b.status) && (status === 'all' || b.status === status)
      && (!from || b.date >= from) && (`${b.ref} ${b.customer} ${b.route}`.toLowerCase().includes(q.toLowerCase())));
  }, [item, status, from, q]);

  const body = () => {
    if (view === 'overview') return (<>
      <div className="tiles">
        {COUNTS.map(([k, l]) => (
          <button key={k} className="tile" onClick={() => go(k === 'pending' || k === 'completed' ? 'requests' : k === 'quoted' || k === 'accepted' ? 'quotes' : k === 'cancelled' ? 'refunds' : 'trips')}>
            <span className="tile-n">{DEMO_BOOKINGS.filter((b) => b.status === k).length}</span><span>{l}</span>
          </button>))}
      </div>
      <p className="muted">Counts are calculated from demo data and will come from the database later.</p>
    </>);
    if (item[3]) return (<>
      <div className="filters">
        <label className="search"><Search size={18} aria-hidden="true" /><span className="sr">Search bookings</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference, customer or route" /></label>
        <label>Status <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option>
          {item[3].map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></label>
        <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      </div>
      {rows.length === 0 ? <EmptyState icon={Inbox} title="No bookings match">Clear the search or filters to see more.</EmptyState> : (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Reference</th><th>Customer</th><th>Route</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>{rows.map((b) => (
            <tr key={b.ref}>
              <td><button className="link" onClick={() => setSel(b)}>{b.ref}</button></td><td>{b.customer}</td>
              <td>{b.route}{b.manual && <span className="tag">Manual review</span>}</td><td>{b.date}</td><td><StatusBadge status={b.status} /></td>
            </tr>))}</tbody>
        </table></div>)}
    </>);
    if (view === 'calendar') return <Calendar onPick={setSel} />;
    if (view === 'fleet' || view === 'drivers') {
      const list = view === 'fleet' ? DEMO_VEHICLES : DEMO_DRIVERS;
      return (<div className="tbl-wrap"><table className="tbl"><thead><tr>
        {view === 'fleet' ? <><th>Vehicle</th><th>Category</th><th>Seats</th></> : <th>Driver</th>}<th>Status</th></tr></thead>
        <tbody>{list.map((r) => <tr key={r.id}>{view === 'fleet' ? <><td>{r.label}</td><td>{r.category}</td><td>{r.seats}</td></> : <td>{r.name}</td>}<td><StatusBadge status={r.status} /></td></tr>)}</tbody></table></div>);
    }
    if (view === 'settings') return (
      <dl className="facts plain">
        {['Rate per km', 'Maximum distance (working assumption: 1,000 km per one-way leg)', 'Minimum distance', 'Quote validity', 'Advance amount and deadline'].map((s) => <div key={s}><dt>{s}</dt><dd className="pending">Not set. The owner must provide this.</dd></div>)}
      </dl>);
    const msg = { payments: ['No payments recorded', 'Verified payments and outstanding balances appear here once the payment gateway is connected.'], reports: ['No completed trips to report', 'Trip history and summaries appear here from real data.'] }[view];
    return <EmptyState icon={item[2]} title={msg[0]}>{msg[1]}</EmptyState>;
  };

  return (
    <div className="dash">
      <aside className={'side' + (open ? ' open' : '')} aria-label="Owner navigation">
        <Link to="/" className="brand">{BRAND.name}</Link>
        <nav>{NAV.map(([k, l, Icon]) => (
          <button key={k} className={view === k ? 'on' : ''} aria-current={view === k ? 'page' : undefined} onClick={() => go(k)}><Icon size={18} aria-hidden="true" />{l}</button>))}</nav>
      </aside>
      <div className="dash-main">
        <div className="topbar">
          <button className="icon-btn side-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
          <h1>{item[1]}</h1>
        </div>
        <div className="dash-body">
          <Alert title="Demo data">Everything here is sample data for design review. Sign-in protection and the real database come with the backend.</Alert>
          {body()}
        </div>
      </div>
      {sel && (
        <Modal title={sel.ref} onClose={() => setSel(null)}>
          <StatusBadge status={sel.status} />
          <dl className="facts plain"><div><dt>Customer</dt><dd>{sel.customer}</dd></div><div><dt>Route</dt><dd>{sel.route}</dd></div>
            <div><dt>Trip</dt><dd>{sel.tripType}, {sel.date}, {sel.passengers} passengers</dd></div></dl>
          <p className="muted">Issuing quotes, assigning vehicles and recording payments need the backend, so these actions are switched off.</p>
          <div className="cta-row"><button className="btn btn-secondary" disabled>Issue quote</button><button className="btn btn-secondary" disabled>Assign vehicle</button></div>
        </Modal>)}
    </div>
  );
}
