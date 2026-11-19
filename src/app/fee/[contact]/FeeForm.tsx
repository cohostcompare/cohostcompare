'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { GST_OPTIONS } from '@/lib/gst';
import { confirmFee } from './actions';

export default function FeeForm({ contact, s, name, slug, min, max }: { contact: string; s: string; name: string; slug: string; min: string; max: string }) {
  const [state, act, pending] = useActionState(confirmFee, {});
  if (state.ok) {
    return (
      <div className="panel" style={{ display: 'grid', gap: 12, background: 'var(--tint)', border: 0 }}>
        <h2 style={{ margin: 0, fontSize: 24 }}>Done. {name} now shows {state.fee}.</h2>
        <p style={{ margin: 0 }}>Owners comparing managers near your homes will see it from now on, marked as confirmed by you.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn primary" href={`/managers/${slug}`}>See your profile</Link>
          <Link className="btn secondary" href={`/claim/${slug}`}>Claim it to add a logo and photos</Link>
        </div>
      </div>
    );
  }
  return (
    <form action={act} className="panel" style={{ display: 'grid', gap: 16 }}>
      <input type="hidden" name="contact" value={contact} />
      <input type="hidden" name="s" value={s} />
      <div className="fee-fields">
        <label>Your fee (%)<input className="field" name="min" inputMode="decimal" required defaultValue={min} placeholder="18" autoFocus={!min} /></label>
        <label>Up to (%), if it varies<input className="field" name="max" inputMode="decimal" defaultValue={max} placeholder="Optional" /></label>
        <label>GST<select className="field" name="gst" defaultValue="plus">{GST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
      </div>
      <span className="hint">The share of booking income you charge an owner for management. Setup, cleaning and other costs go in your quotes.</span>
      {state.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)', fontWeight: 600 }}>{state.error}</p>}
      <div><button className="btn primary btn-big" disabled={pending}>{pending ? 'Saving…' : 'Confirm and show it on my profile'}</button></div>
    </form>
  );
}
