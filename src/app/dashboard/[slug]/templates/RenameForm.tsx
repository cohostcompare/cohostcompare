'use client';

import { useActionState } from 'react';
import { renameTemplate } from './actions';

export default function RenameForm({ slug, name }: { slug: string; name: string }) {
  const [state, act, pending] = useActionState(renameTemplate, {});
  return (
    <form action={act} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="from" value={name} />
      <input className="field" name="to" aria-label={`New name for ${name}`} defaultValue={name} maxLength={60} required style={{ maxWidth: 260, minHeight: 38 }} />
      <button className="btn secondary small" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Rename'}</button>
      {state.ok && <span style={{ color: 'var(--brand)', fontWeight: 600 }}>{state.ok}</span>}
      {state.error && <span role="alert" style={{ color: 'var(--signal)' }}>{state.error}</span>}
    </form>
  );
}
