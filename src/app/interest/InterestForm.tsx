'use client';

import { useActionState } from 'react';
import { interestAction } from './actions';

/** Small sign-up form for suburb reports and partner enquiries. */
export default function InterestForm({ kind, area, button, done, partner, noteLabel = 'What you offer owners, and where' }: { kind: 'report' | 'partner' | 'enterprise'; area?: string; button: string; done: string; partner?: boolean; noteLabel?: string }) {
  const [state, act, pending] = useActionState(interestAction, {});
  if (state.ok) return <p className="panel" style={{ margin: 0, background: 'var(--tint)' }}>{done}</p>;
  return (
    <form action={act} style={{ display: 'grid', gap: 10 }}>
      <input type="hidden" name="kind" value={kind} />
      {area && <input type="hidden" name="area" value={area} />}
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} />
      {partner && <label style={{ display: 'grid', gap: 4, fontWeight: 600, fontSize: 14 }}>Business name<input className="field" name="name" required maxLength={120} /></label>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label className={partner ? undefined : 'sr-only'} style={partner ? { fontWeight: 600, fontSize: 14, flexBasis: '100%' } : undefined} htmlFor={`${kind}-email`}>Email</label>
        <input id={`${kind}-email`} className="field" type="email" name="email" required placeholder="you@example.com" style={{ flex: '1 1 220px' }} />
        {!partner && <button className="btn primary" disabled={pending}>{pending ? 'Saving…' : button}</button>}
      </div>
      {partner && (
        <>
          <label style={{ display: 'grid', gap: 4, fontWeight: 600, fontSize: 14 }}>{noteLabel}<textarea className="field" name="note" required={kind === 'partner'} rows={3} maxLength={1000} /></label>
          <div><button className="btn primary" disabled={pending}>{pending ? 'Sending…' : button}</button></div>
        </>
      )}
      {state.error && <p role="alert" style={{ margin: 0, color: 'var(--danger, #B3261E)' }}>{state.error}</p>}
    </form>
  );
}
