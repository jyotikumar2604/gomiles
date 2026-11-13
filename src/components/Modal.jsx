import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children }) {
  const btn = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    btn.current?.focus();
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('keydown', k); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-h"><h2 id="modal-title">{title}</h2>
          <button ref={btn} className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}
