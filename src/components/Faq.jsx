import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Faq({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq">
      {items.map(([q, a], i) => (
        <div key={q} className={'faq-i' + (open === i ? ' open' : '')}>
          <h3><button aria-expanded={open === i} aria-controls={`faq-${i}`} id={`faq-b-${i}`} onClick={() => setOpen(open === i ? -1 : i)}>
            {q}<ChevronDown size={20} aria-hidden="true" /></button></h3>
          <div id={`faq-${i}`} role="region" aria-labelledby={`faq-b-${i}`} hidden={open !== i}><p>{a}</p></div>
        </div>
      ))}
    </div>
  );
}
