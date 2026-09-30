'use client';

import { useActionState } from 'react';
import { interestAction } from '@/app/interest/actions';

export default function ProInterest({ managerId }: { managerId: string }) {
  const [state, act, pending] = useActionState(interestAction, {});
  if (state.ok) return <p className="panel" style={{ margin: 0, background: 'var(--tint)' }}><b>Thanks, you&apos;re on the list.</b> We&apos;ll email you when Pro opens, before anything is charged.</p>;
  return (
    <form action={act} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="hidden" name="kind" value="pro" />
      <input type="hidden" name="manager" value={managerId} />
      <button className="btn primary" disabled={pending}>{pending ? 'Saving…' : 'Tell me when Pro opens'}</button>
      {state.error && <span role="alert" style={{ color: 'var(--danger, #B3261E)' }}>{state.error}</span>}
    </form>
  );
}
