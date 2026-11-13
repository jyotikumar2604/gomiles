import { useEffect, useState } from 'react';

// Same dusk-highway art as before, reframed (1600x900) so the horizon sits at ~44% of the screen and the car
// stays clear of the booking panel. On narrow screens the viewBox shifts to keep the car in view, higher up.
const dash = ([a, b]) => {
  const p = (t) => [1040 - 280 * t, 400 + 700 * t, 1.5 + 18 * t];
  const [x1, y1, w1] = p(a), [x2, y2, w2] = p(b);
  return `${x1 - w1 / 2},${y1} ${x1 + w1 / 2},${y1} ${x2 + w2 / 2},${y2} ${x2 - w2 / 2},${y2}`;
};
function useNarrow() {
  const q = '(max-width:760px)';
  const [n, setN] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => { const m = window.matchMedia(q); const f = () => setN(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return n;
}
export default function HeroScene() {
  const narrow = useNarrow();
  return (
    <svg className="scene" viewBox={narrow ? '640 140 700 900' : '0 0 1600 900'}
      preserveAspectRatio={narrow ? 'xMaxYMid slice' : 'xMidYMid slice'} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B1220" /><stop offset=".3" stopColor="#17304A" />
          <stop offset=".52" stopColor="#5E5470" /><stop offset=".68" stopColor="#D9854A" />
          <stop offset=".82" stopColor="#F2B866" /><stop offset="1" stopColor="#F6D9A0" />
        </linearGradient>
        <radialGradient id="sun" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#FBE3B0" stopOpacity=".85" /><stop offset="1" stopColor="#E3A94C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A3340" /><stop offset="1" stopColor="#10151F" />
        </linearGradient>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4F0E6" /><stop offset="1" stopColor="#BDB7A8" />
        </linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="16" /></filter>
      </defs>
      <rect y="-200" width="1600" height="600" fill="url(#sky)" />
      <circle cx="1040" cy="400" r="290" fill="url(#sun)" />
      <circle cx="1040" cy="388" r="48" fill="#FBE3B0" />
      <g filter="url(#soft)">
        <ellipse cx="330" cy="130" rx="290" ry="28" fill="#F2B866" opacity=".3" />
        <ellipse cx="700" cy="230" rx="330" ry="24" fill="#F2B866" opacity=".38" />
        <ellipse cx="1320" cy="150" rx="260" ry="26" fill="#E3A94C" opacity=".3" />
        <ellipse cx="1100" cy="300" rx="310" ry="18" fill="#0B1220" opacity=".25" />
        <ellipse cx="180" cy="270" rx="240" ry="20" fill="#0B1220" opacity=".3" />
      </g>
      <path d="M0 400V372Q200 330 400 362T800 358T1200 372T1600 350V400Z" fill="#1A2433" opacity=".95" />
      <rect y="400" width="1600" height="720" fill="#0E1522" />
      <polygon points="1020,400 1060,400 1760,1100 -240,1100" fill="url(#road)" />
      <line x1="1020" y1="400" x2="-240" y2="1100" stroke="#E3A94C" strokeOpacity=".55" strokeWidth="3" />
      <line x1="1060" y1="400" x2="1760" y2="1100" stroke="#E3A94C" strokeOpacity=".55" strokeWidth="3" />
      {[[.03, .07], [.11, .18], [.24, .35], [.43, .6], [.7, .95]].map((d, i) => <polygon key={i} points={dash(d)} fill="#F6D9A0" opacity=".85" />)}
      <g transform="translate(880 478) scale(.82)">
        <ellipse cx="230" cy="134" rx="250" ry="13" fill="#000" opacity=".5" />
        <path d="M0 92L20 70Q40 62 90 58L150 30Q190 14 260 14Q330 14 370 38L420 56Q450 62 458 84V102H0Z" fill="url(#body)" />
        <path d="M168 36Q198 24 252 24V56H152Z" fill="#223049" />
        <path d="M264 24Q322 24 352 44L362 56H264Z" fill="#223049" />
        <rect x="0" y="86" width="458" height="16" fill="#8E8878" opacity=".45" />
        <rect x="446" y="76" width="12" height="8" rx="3" fill="#E3A94C" />
        <rect x="0" y="70" width="8" height="10" rx="3" fill="#B3372F" />
        <circle cx="95" cy="102" r="31" fill="#0B1220" /><circle cx="95" cy="102" r="14" fill="#3B465C" />
        <circle cx="365" cy="102" r="31" fill="#0B1220" /><circle cx="365" cy="102" r="14" fill="#3B465C" />
      </g>
    </svg>
  );
}
