import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TripFields, { emptyTrip, validateTrip, Notices } from './TripFields.jsx';

export default function BookingPanel() {
  const nav = useNavigate();
  const [v, setV] = useState(emptyTrip);
  const [errors, setErrors] = useState({});
  const set = (k, val) => setV((s) => ({ ...s, [k]: val }));
  const submit = (e) => {
    e.preventDefault();
    const er = validateTrip(v);
    setErrors(er);
    const first = Object.keys(er)[0];
    if (first) { document.getElementById(first)?.focus(); return; }
    nav('/request', { state: { trip: v } });
  };
  return (
    <form className="panel" onSubmit={submit} noValidate aria-labelledby="panel-title">
      <h2 id="panel-title">Tell us about your trip</h2>
      <TripFields v={v} set={set} errors={errors} />
      <div className="panel-foot">
        <Notices />
        <button className="btn btn-primary" type="submit">Plan Your Journey</button>
      </div>
    </form>
  );
}
