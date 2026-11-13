import { MapPin, Navigation, CalendarDays, Clock, Users, Car, ShieldCheck, Info } from 'lucide-react';

export const emptyTrip = {
  tripType: 'one-way', pickup: '', destination: '', date: '', time: '',
  returnDate: '', returnTime: '', passengers: 2, vehicle: '', multi: false,
};
export const today = () => new Date().toISOString().slice(0, 10);

export function validateTrip(v) {
  const e = {};
  if (!v.pickup.trim()) e.pickup = 'Enter a pickup location.';
  if (!v.destination.trim()) e.destination = 'Enter a destination.';
  else if (v.destination.trim().toLowerCase() === v.pickup.trim().toLowerCase()) e.destination = 'Destination must be different from pickup.';
  if (!v.date) e.date = 'Choose a departure date.';
  else if (v.date < today()) e.date = 'Departure date cannot be in the past.';
  if (!v.time) e.time = 'Choose a departure time.';
  if (v.tripType === 'round-trip') {
    if (!v.returnDate) e.returnDate = 'Choose a return date.';
    else if (v.date && v.returnDate < v.date) e.returnDate = 'Return date cannot be before departure.';
    if (!v.returnTime) e.returnTime = 'Choose a return time.';
    else if (v.returnDate && v.returnDate === v.date && v.time && v.returnTime <= v.time) e.returnTime = 'Return time must be after departure.';
  }
  const p = Number(v.passengers);
  if (!Number.isInteger(p) || p < 1 || p > 9) e.passengers = 'Passengers must be between 1 and 9.';
  return e;
}

export function Field({ id, label, icon: Icon, error, hint, children }) {
  return (
    <div className={'field' + (error ? ' has-error' : '')}>
      <label htmlFor={id}>{label}</label>
      <div className="control">{Icon && <Icon size={18} aria-hidden="true" />}{children}</div>
      {error ? <p className="err" id={id + '-err'} role="alert">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Notices() {
  return (
    <ul className="notices">
      <li><ShieldCheck size={16} aria-hidden="true" />The final price is confirmed by the owner in a written quote.</li>
      <li><Info size={16} aria-hidden="true" />Tolls are not included in the quoted fare.</li>
    </ul>
  );
}

export default function TripFields({ v, set, errors }) {
  const p = (name) => ({
    id: name, value: v[name], onChange: (e) => set(name, e.target.value),
    'aria-invalid': errors[name] ? true : undefined, 'aria-describedby': errors[name] ? name + '-err' : undefined,
  });
  const round = v.tripType === 'round-trip';
  return (
    <div className="fields">
      <div className="full seg" role="radiogroup" aria-label="Trip type">
        {[['one-way', 'One-way'], ['round-trip', 'Round trip']].map(([k, l]) => (
          <label key={k} className={v.tripType === k ? 'on' : ''}>
            <input type="radio" name="tripType" value={k} checked={v.tripType === k} onChange={() => set('tripType', k)} />{l}
          </label>
        ))}
      </div>
      <Field id="pickup" label="Pickup location" icon={MapPin} error={errors.pickup} hint="Type a city or address. Place search arrives with Google Maps.">
        <input type="text" autoComplete="off" placeholder="e.g. Ahmedabad" {...p('pickup')} />
      </Field>
      <Field id="destination" label="Destination" icon={Navigation} error={errors.destination}>
        <input type="text" autoComplete="off" placeholder="e.g. Rajkot" {...p('destination')} />
      </Field>
      <Field id="date" label="Departure date" icon={CalendarDays} error={errors.date}>
        <input type="date" min={today()} {...p('date')} />
      </Field>
      <Field id="time" label="Departure time" icon={Clock} error={errors.time}>
        <input type="time" {...p('time')} />
      </Field>
      {round && (<>
        <Field id="returnDate" label="Return date" icon={CalendarDays} error={errors.returnDate}>
          <input type="date" min={v.date || today()} {...p('returnDate')} />
        </Field>
        <Field id="returnTime" label="Return time" icon={Clock} error={errors.returnTime}>
          <input type="time" {...p('returnTime')} />
        </Field>
      </>)}
      <Field id="passengers" label="Passengers" icon={Users} error={errors.passengers}>
        <select {...p('passengers')}>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>{n}</option>)}</select>
      </Field>
      <Field id="vehicle" label="Vehicle preference (optional)" icon={Car} hint="Subject to the owner's fleet.">
        <select {...p('vehicle')}>
          <option value="">No preference</option><option value="sedan">Sedan</option>
          <option value="suv">SUV</option><option value="group">Larger group</option>
        </select>
      </Field>
      <label className="full check">
        <input type="checkbox" checked={v.multi} onChange={(e) => set('multi', e.target.checked)} />
        This trip has extra stops or runs over several days (reviewed by hand)
      </label>
    </div>
  );
}
