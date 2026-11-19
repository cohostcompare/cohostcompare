'use client';

import { useActionState } from 'react';
import { notifyWhenCovered } from './actions';

/** Email capture on a search with no managers, so the visit isn't a dead end. */
export default function NotifyForm({ postcode, place }: { postcode: string; place: string }) {
  const [state, act, pending] = useActionState(notifyWhenCovered, {});
  if (state.ok) return <p role="status" style={{ margin: 0, fontWeight: 600, color: 'var(--brand)' }}>Done. We&apos;ll email you as soon as a manager covers {place || 'this address'}.</p>;
  return (
    <form action={act} style={{ display: 'grid', gap: 8 }}>
      <input type="hidden" name="postcode" value={postcode} />
      <input type="hidden" name="place" value={place} />
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label className="sr-only" htmlFor="notify-email">Your email</label>
        <input id="notify-email" className="field" type="email" name="email" required autoComplete="email" placeholder="you@example.com" style={{ flex: '1 1 220px', background: 'var(--panel)' }} />
        <button className="btn primary" disabled={pending}>{pending ? 'Saving…' : 'Email me when they do'}</button>
      </div>
      {state.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{state.error}</p>}
      <span className="hint">One email when a manager covers it. Nothing else.</span>
    </form>
  );
}
