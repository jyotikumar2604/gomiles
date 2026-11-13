import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, UserRound } from 'lucide-react';
import { BRAND } from '../config.js';

export default function Navbar() {
  const { pathname } = useLocation();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 24);
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  const clear = pathname === '/' && !solid && !open;
  const cls = ({ isActive }) => (isActive ? 'active' : undefined);
  return (
    <header className={'nav' + (clear ? ' clear' : '')}>
      <div className="nav-in">
        <Link to="/" className="brand" aria-label={`${BRAND.name} home`}>{BRAND.name}</Link>
        <button className="icon-btn nav-toggle" aria-expanded={open} aria-controls="nav-menu"
          aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav id="nav-menu" className={'nav-menu' + (open ? ' open' : '')} aria-label="Main">
          <NavLink to="/" end className={cls}>Home</NavLink>
          <NavLink to="/request" className={cls}>Plan Your Journey</NavLink>
          <Link to="/#services">Our Services</Link>
          <NavLink to="/about" className={cls}>About</NavLink>
          <NavLink to="/contact" className={cls}>Contact</NavLink>
          <NavLink to="/status" className={cls}>My Booking</NavLink>
          <Link to="/login" className="nav-login"><UserRound size={18} aria-hidden="true" />Log in</Link>
          <Link to="/request" className="btn btn-primary btn-sm">Book a Trip</Link>
        </nav>
      </div>
    </header>
  );
}
