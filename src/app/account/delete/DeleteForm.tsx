'use client';
import { useActionState } from 'react';
import { deleteAccount } from '../owner-actions';

export default function DeleteForm() {
  const [state, act, pending] = useActionState(deleteAccount, {});
  return (
    <form action={act} className="panel" style={{ display: 'grid', gap: 12, borderColor: 'var(--signal)' }}>
      <label style={{ display: 'grid', gap: 6 }}><b>Type DELETE to confirm</b><input className="field" name="confirm" autoComplete="off" required style={{ maxWidth: 240 }} /></label>
      {state.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{state.error}</p>}
      <button className="btn secondary" type="submit" disabled={pending} style={{ justifySelf: 'start', color: 'var(--signal)', borderColor: 'var(--signal)' }}>{pending ? 'Deleting…' : 'Delete my account'}</button>
    </form>
  );
}
