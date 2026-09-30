'use client';

import { useActionState, useEffect, useRef } from 'react';
import { sendOwnerMessage } from '../actions';

export default function Composer({ thread, name }: { thread: string; name: string }) {
  const [state, action, pending] = useActionState(sendOwnerMessage, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);
  return (
    <form ref={form} action={action} className="chat-compose">
      <input type="hidden" name="thread" value={thread} />
      <label htmlFor="msg" className="sr-only">Message {name}</label>
      <textarea id="msg" className="field" name="body" rows={2} maxLength={4000} placeholder={`Write a message to ${name}…`}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit(); }} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn primary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send'}</button>
        {state?.error && <span role="alert" style={{ color: 'var(--signal)' }}>{state.error}</span>}
        {state?.ok && <span className="hint">Sent.</span>}
      </div>
    </form>
  );
}
