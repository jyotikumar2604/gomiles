import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, UserRound, Lock, MessageSquare, Phone } from 'lucide-react';
import { Field } from '../components/TripFields.jsx';
import { Alert } from '../components/UI.jsx';
import PageHero from '../components/PageHero.jsx';
import { sendContact, login, reasonText } from '../services/api.js';
import { BRAND } from '../config.js';

export function About() {
  return (
    <div className="wrap page">
      <PageHero title="How the service works" lead="Pre-booked intercity taxi journeys within Gujarat, quoted and managed by the owner. It is not an instant ride-hailing app." />
      <div className="split">
        <div className="prose">
          <p>Every request is looked at by the owner, who checks vehicles, drivers and schedule before sending a quote. One-way and round trips are supported. Trips with extra stops or several days are accepted too, and are reviewed by hand.</p>
          <p>Route distance helps plan a journey, but the price is the owner&rsquo;s written quote. Tolls are not included. Your booking is confirmed only after you accept a quote and your advance payment is verified.</p>
          <p className="muted">Company background, service areas and fleet details will be added here once the owner provides them.</p>
          <p><Link className="btn btn-primary" to="/request">Plan Your Journey</Link></p>
        </div>
        <aside className="aside"><h2 className="h-sm">What to expect</h2>
          <ol className="stages">{['You send a request', 'The owner reviews it', 'You receive a written quote', 'You accept and pay the advance', 'Your booking is confirmed'].map((t, i) => <li key={t} className={i === 0 ? 'cur' : ''}>{t}</li>)}</ol></aside>
      </div>
    </div>
  );
}

function useForm(init, rules) {
  const [v, setV] = useState(init);
  const [errors, setErrors] = useState({});
  const p = (n) => ({ id: n, value: v[n], onChange: (e) => setV((s) => ({ ...s, [n]: e.target.value })), 'aria-invalid': errors[n] ? true : undefined, 'aria-describedby': errors[n] ? n + '-err' : undefined });
  const check = () => { const er = rules(v); setErrors(er); const f = Object.keys(er)[0]; if (f) document.getElementById(f)?.focus(); return !f; };
  return { v, p, errors, check };
}

export function Contact() {
  const f = useForm({ name: '', email: '', message: '' }, (v) => {
    const e = {};
    if (!v.name.trim()) e.name = 'Enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = 'Enter a valid email address.';
    if (v.message.trim().length < 10) e.message = 'Write at least 10 characters.';
    return e;
  });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const submit = async (e) => {
    e.preventDefault(); if (!f.check()) return;
    setBusy(true); const r = await sendContact(f.v); setBusy(false); setRes(r);
  };
  return (
    <div className="wrap page">
      <PageHero title="Contact and help" lead="Questions about a request, a quote or a booking? Write to us." />
      <div className="split">
        <div className="stack">
          {res?.ok && <Alert tone="success" title="Message sent">We will reply by email.</Alert>}
          {res && !res.ok && <Alert tone="error" title="Message not sent">{reasonText(res, 'Sending messages')}</Alert>}
          <form onSubmit={submit} noValidate className="card-form">
            <div className="fields">
              <Field id="name" label="Your name" icon={UserRound} error={f.errors.name}><input autoComplete="name" {...f.p('name')} /></Field>
              <Field id="email" label="Email" icon={Mail} error={f.errors.email}><input type="email" autoComplete="email" {...f.p('email')} /></Field>
              <div className="full"><Field id="message" label="How can we help?" icon={MessageSquare} error={f.errors.message}><textarea rows="5" {...f.p('message')} /></Field></div>
            </div>
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending\u2026' : 'Send message'}</button>
          </form>
        </div>
        <aside className="aside"><h2 className="h-sm">Direct contact</h2>
          <p className="f-line"><Phone size={18} aria-hidden="true" />{BRAND.phone}</p>
          <p className="f-line"><Mail size={18} aria-hidden="true" />{BRAND.email}</p>
          <p className="muted">These are placeholders until the owner confirms real details and support hours.</p></aside>
      </div>
    </div>
  );
}

export function Login() {
  const f = useForm({ email: '', password: '' }, (v) => {
    const e = {};
    if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = 'Enter a valid email address.';
    if (!v.password) e.password = 'Enter your password.';
    return e;
  });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const submit = async (e) => {
    e.preventDefault(); if (!f.check()) return;
    setBusy(true); const r = await login(f.v); setBusy(false); setRes(r);
  };
  return (
    <div className="wrap page auth">
      <div className="auth-copy"><h1>Welcome back</h1><p className="lead">Log in to follow your requests and quotes.</p>
        <div className="phero-motif" aria-hidden="true"><span className="dot a" /><span className="line" /><span className="dot b" /></div></div>
      <div className="stack">
        {res && !res.ok && <Alert tone="error" title="Not signed in">{reasonText(res, 'Signing in')}</Alert>}
        {res?.ok && <Alert tone="success" title="Signed in">Welcome back.</Alert>}
        <form onSubmit={submit} noValidate className="card-form">
          <div className="fields one">
            <Field id="email" label="Email" icon={Mail} error={f.errors.email}><input type="email" autoComplete="email" {...f.p('email')} /></Field>
            <Field id="password" label="Password" icon={Lock} error={f.errors.password}><input type="password" autoComplete="current-password" {...f.p('password')} /></Field>
          </div>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in\u2026' : 'Log in'}</button>
        </form>
        <p className="muted">Whether customers need accounts is still being decided by the owner. You can already <Link to="/request">request a trip</Link> without one. Registration will be added with the backend.</p>
      </div>
    </div>
  );
}
