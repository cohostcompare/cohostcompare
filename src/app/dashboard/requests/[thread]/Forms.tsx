'use client';

import { useActionState, useEffect, useRef } from 'react';
import { DECLINE_REASONS, MIN_DECLINE_NOTE } from '@/lib/declineReasons';
import { declineRequest, saveTemplate, sendManagerMessage, sendQuote } from '../actions';
import { GST_OPTIONS, gstModeOf } from '@/lib/gst';

const L = { display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 } as const;
const grid = (min: number) => ({ display: 'grid', gap: 12, gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))` });

type T = { name: string; q: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

function fill(form: HTMLFormElement, q: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const set = (n: string, v: unknown) => { const el = form.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null; if (el) el.value = v == null ? '' : String(v); };
  set('fee_pct', q.feePct); set('gst', gstModeOf(q)); set('setup_fee', q.setupFee); set('min_term', q.minTermMonths); set('notice_days', q.noticeDays);
  set('cleaning', q.cleaning ?? ''); set('linen', q.linenIncluded === true ? 'yes' : q.linenIncluded === false ? 'no' : ''); set('included', (q.included || []).join('\n')); set('note', q.note ?? '');
}

export function QuoteForm({ thread, q, defaults, locked, plan, templates, feeText }: { thread: string; q: any; defaults: any; locked: boolean; plan: 'free' | 'pro' | 'enterprise'; templates: T[]; feeText: string }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [state, action, pending] = useActionState(sendQuote, {});
  const [tState, tAction, tPending] = useActionState(saveTemplate, {});
  const ref = useRef<HTMLFormElement>(null);
  const d = q || defaults || {};
  const paid = plan !== 'free';
  return (
    <form ref={ref} action={action} style={{ display: 'grid', gap: 14 }}>
      <input type="hidden" name="thread" value={thread} />
      {paid && templates.length > 0 && !locked && (
        <label style={{ ...L, maxWidth: 360 }}>Start from a template
          <select className="field" defaultValue="" onChange={(e) => { const t = templates.find((x) => x.name === e.target.value); if (t && ref.current) fill(ref.current, t.q); }}>
            <option value="">Choose…</option>{templates.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </label>
      )}
      <div style={grid(150)}>
        <label style={L}>Management fee (%)<input className="field" name="fee_pct" inputMode="decimal" defaultValue={d.feePct ?? ''} required /></label>
        <label style={L}>GST<select className="field" name="gst" defaultValue={q ? gstModeOf(q) : d.gst ? 'plus' : 'includes'}>{GST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <label style={L}>Setup fee (A$)<input className="field" name="setup_fee" inputMode="numeric" defaultValue={d.setupFee ?? ''} placeholder="0 for none" required /></label>
      </div>
      <div style={grid(150)}>
        <label style={L}>Minimum term (months)<input className="field" name="min_term" inputMode="numeric" defaultValue={d.minTermMonths ?? ''} placeholder="0 for no lock-in" required /></label>
        <label style={L}>Notice to leave (days)<input className="field" name="notice_days" inputMode="numeric" defaultValue={d.noticeDays ?? ''} /></label>
        <label style={L}>Cleaning fees<select className="field" name="cleaning" defaultValue={d.cleaning ?? ''}><option value="">Not stated</option><option value="guests">Charged to guests</option><option value="owner">Charged to the owner</option></select></label>
        <label style={L}>Linen<select className="field" name="linen" defaultValue={d.linenIncluded === true ? 'yes' : d.linenIncluded === false ? 'no' : ''}><option value="">Not stated</option><option value="yes">Included</option><option value="no">Extra cost</option></select></label>
      </div>
      <div style={grid(180)}>
        <label style={L}>Estimated nightly rate (A$, optional)<input className="field" name="est_rate" inputMode="numeric" defaultValue={d.estNightlyRate ?? ''} /></label>
        <label style={L}>Estimated nights booked (%, optional)<input className="field" name="est_occ" inputMode="numeric" defaultValue={d.estOccupancyPct ?? ''} /></label>
      </div>
      <label style={L}>What&apos;s included (one per line)<textarea className="field" name="included" rows={3} defaultValue={(d.included || []).join('\n')} /></label>
      <label style={L}>Note to the owner (optional)<textarea className="field" name="note" rows={3} maxLength={1500} defaultValue={d.note || ''} placeholder="Why you're a good fit for this property, or anything you'd need to confirm." /></label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn primary" type="submit" disabled={pending || locked}>{pending ? 'Sending…' : q ? 'Update quote' : 'Send quote'}</button>
        {state?.error && <span role="alert" style={{ color: 'var(--signal)' }}>{state.error}</span>}
        {state?.ok && <span role="status" style={{ color: 'var(--brand)', fontWeight: 600 }}>Sent. The owner has been emailed.</span>}
      </div>
      <p className="hint" style={{ margin: 0 }}>Every manager quotes in this same format, so owners compare like with like. Estimates are optional and are shown to the owner as your estimate.</p>
      {!paid && <p className="hint" style={{ margin: 0 }}>You&apos;re on the Free plan: it includes 4 accepted clients a month, then {feeText} each. <a href="/managers#pricing">Pro</a> includes unlimited clients.</p>}
      {!locked && (paid ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <input className="field" name="template_name" aria-label="Template name" placeholder="Template name, e.g. Standard 2-bed" style={{ maxWidth: 260, minHeight: 38 }} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
          <button className="btn secondary small" formAction={tAction} disabled={tPending}>{tPending ? 'Saving…' : 'Save as template'}</button>
          {tState?.ok && <span style={{ color: 'var(--brand)', fontWeight: 600 }}>{tState.ok}</span>}
          {tState?.error && <span role="alert" style={{ color: 'var(--signal)' }}>{tState.error}</span>}
        </div>
      ) : <p className="hint" style={{ margin: 0 }}>Quote templates are part of <a href="/managers#pricing">Pro</a>.</p>)}
    </form>
  );
}

export function ManagerComposer({ thread, name }: { thread: string; name: string }) {
  const [state, action, pending] = useActionState(sendManagerMessage, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="chat-compose">
      <input type="hidden" name="thread" value={thread} />
      <label htmlFor="mmsg" className="sr-only">Message {name}</label>
      <textarea id="mmsg" className="field" name="body" rows={2} maxLength={4000} placeholder={`Write a message to ${name}…`}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit(); }} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn primary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send'}</button>
        {state?.error && <span role="alert" style={{ color: 'var(--signal)' }}>{state.error}</span>}
        {state?.ok && <span className="hint">Sent.</span>}
      </div>
    </form>
  );
}

/** "Can't take this on": at least one standard reason plus a note, both shown to the owner. */
export function DeclineForm({ thread, owner }: { thread: string; owner: string }) {
  const [state, act, pending] = useActionState(declineRequest, {} as { error?: string });
  return (
    <form action={act} style={{ display: 'grid', gap: 12, marginTop: 10 }}>
      <input type="hidden" name="thread" value={thread} />
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>Why can&apos;t you take it on? <span className="hint">(choose at least one)</span></legend>
        {DECLINE_REASONS.map((r) => <label key={r} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><input type="checkbox" name="reasons" value={r} style={{ marginTop: 4 }} /> <span>{r}</span></label>)}
      </fieldset>
      <label style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontWeight: 600 }}>Note for {owner} <span className="hint">(required)</span></span>
        <textarea className="field" name="note" rows={3} required minLength={MIN_DECLINE_NOTE} maxLength={800} placeholder="e.g. We only take properties we can manage for at least 9 months of the year. If that changes, we'd be happy to quote." />
      </label>
      <p className="hint" style={{ margin: 0 }}>{owner} sees your reasons and note in their inbox and by email. This closes the request for you.</p>
      {state?.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{state.error}</p>}
      <button className="btn secondary" type="submit" disabled={pending} style={{ justifySelf: 'start' }}>{pending ? 'Sending…' : `Decline and tell ${owner}`}</button>
    </form>
  );
}
