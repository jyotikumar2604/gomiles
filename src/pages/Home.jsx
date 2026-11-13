import { Link } from 'react-router-dom';
import { Phone, Mail, ShieldCheck, FileText, Route as RouteIcon } from 'lucide-react';
import BookingPanel from '../components/BookingPanel.jsx';
import Faq from '../components/Faq.jsx';
import { BRAND } from '../config.js';

const FAQ = [
  ['Is my booking confirmed when I submit the form?', 'No. Submitting sends a request. The owner reviews it and sends a quote. The booking is confirmed only after you accept the quote and your advance payment is verified.'],
  ['How is the price decided?', 'The owner sets it. Road distance from a routing service helps the owner plan, but the price you pay is the one in the owner\u2019s written quote.'],
  ['Are tolls included?', 'No. Tolls are not included in the quoted fare. Your quote will explain how they are handled.'],
  ['How far can I travel?', 'The owner sets the distance limits and will show them when they are final. Longer or unusual trips can be sent for manual review.'],
  ['Can I add stops or travel for several days?', 'Yes. Tick the option on the form and describe the plan. These requests are reviewed by hand, so a quote can take longer.'],
  ['What if I need to cancel?', 'Cancellation and refund rules are being finalised by the owner. They will be shown before you pay anything.'],
];

export default function Home() {
  return (<>
    <section className="hero">
      <div className="wrap hero-in">
        <div className="hero-copy">
          <h1>Your Journey. Your Comfort. Your Way.</h1>
          <p>Pre-book comfortable intercity travel across Gujarat. Send your trip details, receive a written quote from the owner, and confirm once your advance is paid.</p>
          <div className="cta-row">
            <Link to="/request" className="btn btn-primary">Plan Your Journey</Link>
            <Link to="/#how" className="btn btn-ghost">Explore How It Works</Link>
          </div>
        </div>
        <div className="route-chip" aria-hidden="true">
          <span className="dot a" /><span className="line" /><span className="dot b" />
          <div><b>Pickup</b><b>Destination</b></div>
          <small>Distance and travel time appear after your route is calculated.</small>
        </div>
      </div>
    </section>

    <div className="wrap panel-wrap"><BookingPanel /></div>

    <section id="how" className="section wrap">
      <h2>How it works</h2>
      <ol className="steps">
        <li><h3>Request a trip</h3><p>Tell us the route, dates and number of passengers. Nothing is charged at this stage.</p></li>
        <li><h3>Receive a quote</h3><p>The owner checks vehicles, drivers and schedule, then sends a written quote.</p></li>
        <li><h3>Confirm the booking</h3><p>Accept the quote and pay the advance. Your booking is confirmed once the payment is verified.</p></li>
      </ol>
    </section>

    <section id="services" className="section wrap">
      <h2>Travel options</h2>
      <div className="options">
        <article><h3>One-way</h3><p>A single journey from one city or address to another. Distance limits are set by the owner.</p></article>
        <article><h3>Round trip</h3><p>Go and return with the same vehicle. You choose both dates and times when you request.</p></article>
        <article><h3>Custom journey</h3><p>Extra stops or several days of travel. These requests are reviewed by hand and quoted individually.</p></article>
      </div>
    </section>

    <section className="band section">
      <div className="wrap band-in">
        <h2>A better way to plan intercity travel</h2>
        <ul className="ticks">
          <li><FileText size={20} aria-hidden="true" />Your request and quote are written down, so both sides know what was agreed.</li>
          <li><ShieldCheck size={20} aria-hidden="true" />Prices come from the owner, not from an automatic algorithm.</li>
          <li><RouteIcon size={20} aria-hidden="true" />Nothing is confirmed until your payment is verified.</li>
        </ul>
      </div>
    </section>

    <section className="section wrap">
      <h2>Transparent journey information</h2>
      <dl className="defs">
        <div><dt>Road distance</dt><dd>How far the route is by road, from a routing service. It is not the price.</dd></div>
        <div><dt>Estimated travel time</dt><dd>How long the drive may take. It is shown separately and does not set the fare.</dd></div>
        <div><dt>Estimate</dt><dd>A guide shown only when the owner&rsquo;s rate is available. It can change.</dd></div>
        <div><dt>Owner quote</dt><dd>The owner&rsquo;s written price offer. Only an accepted quote leads to a booking.</dd></div>
        <div><dt>Tolls</dt><dd>Not included in the quoted fare.</dd></div>
      </dl>
    </section>

    <section className="section wrap faq-wrap">
      <h2>Frequently asked questions</h2>
      <Faq items={FAQ} />
    </section>

    <section className="section wrap">
      <div className="help">
        <div><h2>Need help with a booking?</h2><p>Write to us or call. Contact details below are placeholders until the owner confirms them.</p></div>
        <div className="help-links">
          <a href={`tel:${BRAND.phone.replace(/\s/g, '')}`}><Phone size={18} aria-hidden="true" />{BRAND.phone}</a>
          <a href={`mailto:${BRAND.email}`}><Mail size={18} aria-hidden="true" />{BRAND.email}</a>
          <Link to="/contact" className="btn btn-secondary">Send a message</Link>
        </div>
      </div>
    </section>
  </>);
}
