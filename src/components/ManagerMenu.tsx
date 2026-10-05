'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Item = { id: string; label: string; manager: string };
type Mgr = { slug: string; name: string };

/** "Manager portal" button in the header: to-dos, then quick links to every part of the portal. */
export default function ManagerMenu({ items, managers }: { items: Item[]; managers: Mgr[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const many = new Set(items.map((i) => i.manager)).size > 1;
  const one = managers.length === 1 ? managers[0] : null;
  const per = (slug: string) => [
    ['Edit profile', `/dashboard/${slug}/edit`],
    ['Properties you take on', `/dashboard/${slug}/requirements`],
    ['Insights', `/dashboard/${slug}/insights`],
    ['Alerts', `/dashboard/${slug}/alerts`],
    ['Team', `/dashboard/${slug}/team`],
    ['Quote templates', `/dashboard/${slug}/templates`],
    ['Public profile', `/managers/${slug}`],
  ] as const;
  return (
    <div ref={ref} className="acct">
      <button type="button" className="btn secondary small acct-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        Manager portal{items.length ? <span className="dot" aria-label={`${items.length} to do`}>{items.length}</span> : null} <span aria-hidden="true">▾</span>
      </button>
      <div className="acct-pop acct-pop-wide" hidden={!open}>
        {items.length ? (
          <div className="todo-box">
            <span className="todo-title">{items.length} thing{items.length === 1 ? '' : 's'} to do</span>
            {items.slice(0, 5).map((i) => (
              <Link key={i.id} href={`/dashboard/requests/${i.id}`}>{i.label}{many ? <span className="hint">{i.manager}</span> : null}</Link>
            ))}
            {items.length > 5 && <Link href="/dashboard/requests?f=needs">See all {items.length}</Link>}
          </div>
        ) : <span className="hint" style={{ padding: '2px 10px 6px' }}>You&apos;re all caught up.</span>}
        <div className="pop-cols">
          <div>
            <span className="pop-head">Portal</span>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/dashboard/requests">Quote requests</Link>
            <Link href="/dashboard/reports">Market reports</Link>
            <Link href="/managers#pricing">Plans and pricing</Link>
          </div>
          {one ? (
            <div>
              <span className="pop-head">{one.name}</span>
              {per(one.slug).map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
            </div>
          ) : managers.length > 1 ? (
            <div>
              <span className="pop-head">Your profiles</span>
              {managers.slice(0, 4).map((m) => <Link key={m.slug} href={`/dashboard/${m.slug}/edit`}>{m.name}<span className="hint">Edit profile</span></Link>)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
