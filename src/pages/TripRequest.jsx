import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import TripFields, { Field, emptyTrip, validateTrip, Notices } from '../components/TripFields.jsx';
import RouteSummary from '../components/RouteSummary.jsx';
import { Alert } from '../components/UI.jsx';
import PageHero from '../components/PageHero.jsx';
import { UserRound, Phone, Mail } from 'lucide-react';
import { getRouteEstimate, submitTripRequest, reasonText } from '../services/api.js';

const emptyX = { name: '', phone: '', email: '', stops: '', notes: '' };

export default function TripRequest() {
  const { state } = useLocation();
  const [v, setV] = useState({ ...emptyTrip, ...(state?.trip || {}) });
  const [x, setX] = useState(emptyX);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState('form');
  const [est, setEst] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const set = (k, val) => setV((s) => ({ ...s, [k]: val }));
  const setx = (k, val) => setX((s) => ({ ...s, [k]: val }));
  const px = (n) => ({ id: n, value: x[n], onChange: (e) => setx(n, e.target.value), 'aria-invalid': errors[n] ? true : undefined, 'aria-describedby': errors[n] ? n + '-err' : undefined });

  useEffect(() => {
    if (step !== 'review') return;
    let live = true; setLoading(true);
    getRouteEstimate({ ...v, stops: x.stops })
      .then((r) => live && setEst(r)).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [step]); // eslint-disable-line

  const review = (e) => {
    e.preventDefault();
    const er = validateTrip(v);
    if (!x.name.trim()) er.name = 'Enter your name.';
    if (!/^(\+91)?[6-9]\d{9}$/.test(x.phone.replace(/[\s-]/g, ''))) er.phone = 'Enter a 10-digit Indian mobile number.';
    if (x.email && !/^\S+@\S+\.\S+$/.test(x.email)) er.email = 'Enter a valid email address or leave it blank.';
    if (v.multi && !x.stops.trim()) er.stops = 'Describe the extra stops or days.';
    setErrors(er);
    const first = Object.keys(er)[0];
    if (first) { document.getElementById(first)?.focus(); return; }
    setResult(null); setStep('review'); window.scrollTo(0, 0);
  };

  const send = async () => {
    setSending(true); setResult(null);
    const res = await submitTripRequest({ trip: { ...v, stops: x.stops }, contact: x });
    setSending(false);
    if (res.ok) setResult({ ok: true, ref: res.data?.reference, token: res.data?.trackingToken });
    else setResult({ ok: false, text: reasonText(res, 'Sending your request') });
  };

  if (result?.ok) return (
    <div className="wrap page narrow">
      <Alert tone="success" title="Request sent">Reference {result.ref}. Your tracking code is {result.token}. Save both now: the code is shown only once and is needed to check your status. The owner will review your request and send a quote. This is not a confirmed booking.</Alert>
      <p><Link className="btn btn-secondary" to="/status">Check booking status</Link></p>
    </div>
  );

  const live = { ...v, pickup: v.pickup || 'Pickup', destination: v.destination || 'Destination' };
  return (
    <div className="wrap page">
      <PageHero title={step === 'form' ? 'Request a trip' : 'Review your request'}
        lead={step === 'form' ? 'Tell us where and when. The owner reviews every request and replies with a written quote.' : 'Check the details. Nothing is booked until you accept a quote and your advance is verified.'} />
      <div className="split">
        {step === 'form' ? (<>
          <form onSubmit={review} noValidate className="card-form">
            <TripFields v={v} set={set} errors={errors} />
            {v.multi && (
              <Field id="stops" label="Extra stops or multi-day details" error={errors.stops}>
                <textarea rows="3" placeholder="List stops in order and the number of days." {...px('stops')} />
              </Field>
            )}
            <h2 className="h-sm">Your details</h2>
            <div className="fields">
              <Field id="name" label="Full name" icon={UserRound} error={errors.name}><input type="text" autoComplete="name" {...px('name')} /></Field>
              <Field id="phone" label="Mobile number" icon={Phone} error={errors.phone} hint="Indian mobile, with or without +91."><input type="tel" autoComplete="tel" {...px('phone')} /></Field>
              <Field id="email" label="Email (optional)" icon={Mail} error={errors.email}><input type="email" autoComplete="email" {...px('email')} /></Field>
              <div className="full"><Field id="notes" label="Notes for the owner (optional)"><textarea rows="3" {...px('notes')} /></Field></div>
            </div>
            <Notices />
            <button className="btn btn-primary" type="submit">Review request</button>
          </form>
          <aside className="aside" aria-label="Your journey so far"><h2 className="h-sm">Your journey</h2><RouteSummary trip={live} estimate={null} loading={false} /></aside>
        </>) : (
          <div className="stack full-col">
            <RouteSummary trip={v} estimate={est} loading={loading} />
            {v.multi && <Alert title="Manual review">Extra stops or multi-day trips are reviewed by hand. {x.stops}</Alert>}
            <dl className="facts plain surface"><div><dt>Name</dt><dd>{x.name}</dd></div><div><dt>Mobile</dt><dd>{x.phone}</dd></div>{x.email && <div><dt>Email</dt><dd>{x.email}</dd></div>}</dl>
            {result && !result.ok && <Alert tone="error" title="Request not sent">{result.text}</Alert>}
            <Notices />
            <div className="cta-row">
              <button className="btn btn-secondary" onClick={() => setStep('form')}>Edit details</button>
              <button className="btn btn-primary" onClick={send} disabled={sending}>{sending ? 'Sending\u2026' : 'Send request'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
