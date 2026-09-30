'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Item = { id: string; label: string; manager: string };

/** Manager dashboard button with a to-do count and a pop-up list of what needs doing. */
export default function ManagerMenu({ items }: { items: Item[] }) {
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
  return (
    <div ref={ref} className="acct">
      <button type="button" className="btn secondary small acct-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        Manager dashboard{items.length ? <span className="dot" aria-label={`${items.length} to do`}>{items.length}</span> : null} <span aria-hidden="true">▾</span>
      </button>
      <div className="acct-pop" hidden={!open}>
        {items.length ? (
          <>
            <span className="hint" style={{ padding: '2px 10px 4px', fontWeight: 700, color: 'var(--signal)' }}>{items.length} thing{items.length === 1 ? '' : 's'} to do</span>
            {items.slice(0, 6).map((i) => (
              <Link key={i.id} href={`/dashboard/requests/${i.id}`}>{i.label}{many ? <span className="hint">{i.manager}</span> : null}</Link>
            ))}
            {items.length > 6 && <Link href="/dashboard/requests?f=needs">See all {items.length}</Link>}
          </>
        ) : <span className="hint" style={{ padding: '2px 10px 6px' }}>You&apos;re all caught up.</span>}
        <Link href="/dashboard">Dashboard<span className="hint">Requests, insights, reports and alerts</span></Link>
        <Link href="/dashboard/requests">All quote requests</Link>
      </div>
    </div>
  );
}
