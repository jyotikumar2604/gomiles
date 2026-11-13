import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import HeroScene from './HeroScene.jsx';

// ONE fixed layer behind every page. Only the opacity of the dim layer changes while scrolling
// (cheap: no blur, no repaint of the scene), so the atmosphere deepens smoothly from hero to footer.
// Base dimness per route keeps text readable: lighter on Home, heavier on forms and the dashboard.
const BASE = { '/': 0.05, '/owner': 0.82 };
export default function PageBackground() {
  const { pathname } = useLocation();
  const dim = useRef(null);
  const base = BASE[pathname] ?? 0.62;
  useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      const k = Math.min(window.scrollY / (window.innerHeight * 0.9), 1);
      const max = pathname === '/' ? 0.82 : 0.9;
      dim.current?.style.setProperty('opacity', String(base + (max - base) * k));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [pathname, base]);
  return (
    <div className="bg" aria-hidden="true">
      <HeroScene />
      <div className="bg-left" />
      <div className="bg-dim" ref={dim} />
    </div>
  );
}
