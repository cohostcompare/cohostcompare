'use client';

import { useActionState, useEffect, useRef } from 'react';
import { sendOwnerMessage } from '../actions';

export default function Composer({ thread }: { thread: string }) {
  const [state, action, pending] = useActionState(sendOwnerMessage, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);
  return (
    <form ref={form} action={action} style={{ display: 'grid', gap: 10 }}>
      <input type="hidden" name="thread" value={thread} />
      <label htmlFor="msg" className="label">Your message</label>
      <textarea id="msg" className="field" name="body" rows={3} maxLength={4000} placeholder="Ask about fees, availability, how they'd price your place…" />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn primary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send message'}</button>
        {state?.error && <span role="alert" style={{ color: 'var(--signal)' }}>{state.error}</span>}
        {state?.ok && <span className="hint">Sent.</span>}
      </div>
    </form>
  );
}
