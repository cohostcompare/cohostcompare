'use client';

import { useActionState } from 'react';
import { invite } from './actions';

export default function InviteForm({ slug, disabled }: { slug: string; disabled: boolean }) {
  const [state, act, pending] = useActionState(invite, {});
  return (
    <form action={act} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <input type="hidden" name="slug" value={slug} />
      <input className="field" type="email" name="email" required placeholder="colleague@yourbusiness.com.au" style={{ flex: '1 1 240px', maxWidth: 360 }} disabled={disabled} />
      <button className="btn primary" disabled={pending || disabled}>{pending ? 'Sending…' : 'Invite'}</button>
      {state.ok && <span style={{ color: 'var(--brand)', fontWeight: 600 }}>{state.ok}</span>}
      {state.error && <span role="alert" style={{ color: 'var(--danger, #B3261E)' }}>{state.error}</span>}
    </form>
  );
}
