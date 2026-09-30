'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { signOut } from '@/app/account/auth-actions';

/** Signed-in owner's menu: portal pages and sign out. */
export default function AccountMenu({ email, unread }: { email: string; unread: number }) {
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
  return (
    <div ref={ref} className="acct">
      <button type="button" className="btn secondary small acct-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        Owner portal{unread ? <span className="dot" aria-label={`${unread} unread`}>{unread}</span> : null} <span aria-hidden="true">▾</span>
      </button>
      <div className="acct-pop" hidden={!open}>
        <span className="hint" style={{ padding: '2px 10px 6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span>
        <Link href="/account">Inbox<span className="hint">Quotes and conversations with managers{unread ? ` · ${unread} new` : ''}</span></Link>
        <Link href="/">New search<span className="hint">Compare managers for another property</span></Link>
        <form action={signOut}><button type="submit">Sign out</button></form>
      </div>
    </div>
  );
}
