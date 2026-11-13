import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { BRAND } from '../config.js';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div>
          <p className="brand">{BRAND.name}</p>
          <p className="muted-d">Pre-booked intercity taxi journeys. Every trip is reviewed and quoted by the owner.</p>
        </div>
        <nav aria-label="Footer">
          <p className="f-h">Travel</p>
          <Link to="/request">Plan Your Journey</Link>
          <Link to="/status">Booking status</Link>
          <Link to="/#how">How it works</Link>
        </nav>
        <nav aria-label="Company">
          <p className="f-h">Company</p>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/owner">Owner dashboard (demo)</Link>
        </nav>
        <div>
          <p className="f-h">Contact (placeholders)</p>
          <p className="f-line"><Phone size={16} aria-hidden="true" />{BRAND.phone}</p>
          <p className="f-line"><Mail size={16} aria-hidden="true" />{BRAND.email}</p>
          <p className="f-line"><MapPin size={16} aria-hidden="true" />{BRAND.area}</p>
        </div>
      </div>
      <div className="wrap f-base">
        <p>Tolls are not included in quoted fares. Policies for cancellation and refunds will be published before payments go live.</p>
        <p>&copy; {new Date().getFullYear()} {BRAND.name}</p>
      </div>
    </footer>
  );
}
