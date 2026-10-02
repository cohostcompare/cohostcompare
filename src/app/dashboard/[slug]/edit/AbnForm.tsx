'use client';

import { useActionState } from 'react';
import { saveAbn } from './actions';

export default function AbnForm({ slug, abn, verified }: { slug: string; abn: string | null; verified: boolean }) {
  const [state, action, pending] = useActionState(saveAbn, {});
  return (
    <form action={action} className="panel" style={{ display: 'grid', gap: 10 }}>
      <input type="hidden" name="slug" value={slug} />
      <b>Verified business badge</b>
      <p className="hint" style={{ margin: 0 }}>Enter your ABN. We check it on the Australian Business Register, and if the registered name matches your business, your profile shows a <b>✓ Verified business</b> badge. Your ABN itself isn&apos;t shown publicly.</p>
      {verified && <p style={{ margin: 0, color: 'var(--brand)', fontWeight: 700 }}>✓ Verified</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="field" name="abn" aria-label="ABN" defaultValue={abn || ''} inputMode="numeric" placeholder="11-digit ABN" style={{ maxWidth: 240 }} />
        <button className="btn secondary" type="submit" disabled={pending}>{pending ? 'Checking…' : 'Save and verify'}</button>
      </div>
      {state?.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{state.error}</p>}
      {state?.ok && <p role="status" style={{ margin: 0 }}>{state.ok}</p>}
    </form>
  );
}
