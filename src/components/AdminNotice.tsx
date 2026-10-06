'use client';

import { useEffect, useState } from 'react';

/** A confirmation or error after an admin action, fixed to the bottom of the screen so it's seen wherever the page is scrolled. */
export default function AdminNotice({ done, error }: { done?: string; error?: string }) {
  const [open, setOpen] = useState(Boolean(done || error));
  useEffect(() => {
    if (!open || error) return;
    const t = setTimeout(() => setOpen(false), 12000);
    return () => clearTimeout(t);
  }, [open, error]);
  if (!open) return null;
  return (
    <div className={`admin-notice${error ? ' err' : ''}`} role={error ? 'alert' : 'status'}>
      <span>{error ? '⚠ ' : '✓ '}{error || done}</span>
      <button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button>
    </div>
  );
}
