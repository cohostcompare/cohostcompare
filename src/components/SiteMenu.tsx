'use client';

import Link from 'next/link';
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

/** A main-menu link that highlights when you're on its page. */
export function NavLink({ href, exact, also = [], highlight, children }: { href: string; exact?: boolean; also?: string[]; highlight?: boolean; children: React.ReactNode }) {
  const path = usePathname() || '/';
  const on = href === '/' || exact ? path === href || also.some((a) => path.startsWith(a)) : path.startsWith(href) || also.some((a) => path.startsWith(a));
  return <Link href={href} className={`nav-link${on ? ' on' : ''}${highlight ? ' hl' : ''}`} aria-current={on ? 'page' : undefined}>{children}</Link>;
}

/** A small drop-down group in the main menu (flat list inside the phone menu). */
export function NavMore({ label, items }: { label: string; items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname() || '/';
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', away);
    return () => document.removeEventListener('click', away);
  }, [open]);
  const on = items.some((i) => path.startsWith(i.href));
  return (
    <div ref={ref} className="navmore">
      <button type="button" className={`nav-link${on ? ' on' : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{label} <span aria-hidden="true" style={{ marginLeft: 4, fontSize: 11 }}>▾</span></button>
      <div className={`navmore-pop${open ? ' open' : ''}`}>
        {items.map((i) => <Link key={i.href} href={i.href} className={`nav-link${path.startsWith(i.href) ? ' on' : ''}`}>{i.label}</Link>)}
      </div>
    </div>
  );
}
