'use client';

import { useActionState } from 'react';
import { saveAlerts, testSms } from './actions';

export function AlertsForm({ slug, mobile, sms, reports, pro }: { slug: string; mobile: string; sms: boolean; reports: boolean; pro: boolean }) {
  const [state, act, pending] = useActionState(saveAlerts, {});
  const [tState, tAct, tPending] = useActionState(testSms, {});
  const local = mobile.replace(/^\+61/, '0');
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <form action={act} className="panel" style={{ display: 'grid', gap: 12 }}>
        <input type="hidden" name="slug" value={slug} />
        <label style={{ display: 'grid', gap: 4, fontWeight: 600, fontSize: 14 }}>Mobile for alerts
          <input className="field" name="mobile" inputMode="tel" defaultValue={local} placeholder="e.g. 0412 345 678" style={{ maxWidth: 260 }} />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" name="sms" defaultChecked={sms} disabled={!pro} />
          <span>Text me when an owner asks for a quote, sends me a message or accepts my quote{pro ? '' : ' (Pro)'}</span>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" name="reports" defaultChecked={reports} />
          <span>Email me when a new regional report for my regions is ready</span>
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn primary" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>
          {state.ok && <span style={{ color: 'var(--brand)', fontWeight: 600 }}>{state.ok}</span>}
          {state.error && <span role="alert" style={{ color: 'var(--danger, #B3261E)' }}>{state.error}</span>}
        </div>
      </form>
      {pro && mobile && (
        <form action={tAct} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="hidden" name="slug" value={slug} />
          <button className="btn secondary" disabled={tPending}>{tPending ? 'Sending…' : 'Send a test text'}</button>
          {tState.ok && <span style={{ color: 'var(--brand)', fontWeight: 600 }}>{tState.ok}</span>}
          {tState.error && <span role="alert" style={{ color: 'var(--danger, #B3261E)' }}>{tState.error}</span>}
        </form>
      )}
    </div>
  );
}
