'use client';
import { useActionState } from 'react';
import { AVAILABILITY, PROPERTY_TYPES, describe, type Requirements } from '@/lib/requirements';

type State = { ok?: string; error?: string };

/** The "properties we take on" form, used in the manager dashboard and by admin. */
export default function RequirementsForm({ action, hidden, r, who = 'you' }: { action: (s: State, f: FormData) => Promise<State>; hidden: Record<string, string>; r: Requirements | null; who?: string }) {
  const [state, act, pending] = useActionState(action, {});
  const types = r?.types?.length ? r.types : [...PROPERTY_TYPES];
  const L = { display: 'grid', gap: 6, alignContent: 'start' } as const;
  return (
    <form action={act} className="panel" style={{ display: 'grid', gap: 18 }}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <label style={L}><b>How much of the year must the property be available for guests?</b>
        <select className="field" name="minMonths" defaultValue={String(r?.minMonths ?? '')} style={{ maxWidth: 420 }}>
          <option value="">Any amount</option>
          {AVAILABILITY.filter((a) => a.months >= 3).map((a) => <option key={a.v} value={a.months}>At least {a.months === 12 ? 'all year' : `${a.months} months a year`}</option>)}
        </select>
        <span className="hint">For example, choose 9 months if you don&apos;t take on homes the owner uses a lot themselves.</span>
      </label>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        <legend style={{ fontWeight: 700, marginBottom: 6 }}>Property types {who === 'you' ? 'you take on' : 'they take on'}</legend>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {PROPERTY_TYPES.map((t) => <label key={t} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" name="types" value={t} defaultChecked={types.includes(t)} /> {t}</label>)}
        </div>
      </fieldset>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label style={L}><b>Fewest bedrooms</b>
          <select className="field" name="minBeds" defaultValue={r?.minBeds != null ? String(r.minBeds) : ''}><option value="">No minimum</option>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n === 6 ? '6+' : n}</option>)}</select></label>
        <label style={L}><b>Most bedrooms</b>
          <select className="field" name="maxBeds" defaultValue={r?.maxBeds != null ? String(r.maxBeds) : ''}><option value="">No maximum</option>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? 'Studio' : n}</option>)}</select></label>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><input type="checkbox" name="fullOnly" defaultChecked={Boolean(r?.fullOnly)} style={{ marginTop: 4 }} /> <span><b>Full management only.</b> Don&apos;t send requests from owners who only want some services, like pricing or cleaning.</span></label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><input type="checkbox" name="ownersOnly" defaultChecked={Boolean(r?.ownersOnly)} style={{ marginTop: 4 }} /> <span><b>Owners and buyers under contract only.</b> Don&apos;t send requests from people still planning to buy.</span></label>
      <label style={L}><b>Anything else owners should know?</b> <span className="hint">Optional. Shown on {who === 'you' ? 'your' : 'their'} profile, but not used to filter requests.</span>
        <textarea className="field" name="note" rows={2} maxLength={300} defaultValue={r?.note || ''} placeholder="e.g. We need our own lockbox or smart lock fitted." /></label>
      {state.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{state.error}</p>}
      {state.ok && <p role="status" style={{ margin: 0, color: 'var(--brand)', fontWeight: 600 }}>{state.ok}</p>}
      <button className="btn primary" type="submit" disabled={pending} style={{ justifySelf: 'start' }}>{pending ? 'Saving…' : 'Save requirements'}</button>
      {r && describe(r).length > 0 && <p className="hint" style={{ margin: 0 }}>Currently: {describe(r).join(' · ')}</p>}
    </form>
  );
}
