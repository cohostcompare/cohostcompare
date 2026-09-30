'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/** Main menu: always visible inline on wide screens; a toggle-able drop-down on narrow ones. */
export default function SiteMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div ref={ref} className={`menu${open ? ' open' : ''}`}>
      <button type="button" className="menu-toggle" aria-label="Menu" aria-expanded={open} aria-controls="main-menu" onClick={() => setOpen((o) => !o)}>
        <span /><span /><span />
      </button>
      <nav id="main-menu" className="menu-body" aria-label="Main">{children}</nav>
    </div>
  );
}
