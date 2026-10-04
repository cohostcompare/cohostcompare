'use client';

import { useActionState } from 'react';
import { requestGuide, type GuideState } from '@/app/setup/guide-actions';

const STATES = [['nsw', 'New South Wales'], ['vic', 'Victoria'], ['qld', 'Queensland'], ['wa', 'Western Australia'], ['sa', 'South Australia'], ['tas', 'Tasmania'], ['act', 'ACT'], ['nt', 'Northern Territory']];

/** Free setup guide (PDF) for an email. Follow-up emails only if they tick the box. */
export default function GuideSignup({ compact }: { compact?: boolean }) {
  const [state, act, pending] = useActionState<GuideState, FormData>(requestGuide, {});
  return (
    <section className={`guide-signup${compact ? ' compact' : ''}`} aria-labelledby="guide-h">
      <div className="guide-cover" aria-hidden="true"><b>The short-term rental setup guide</b><span>Rules · insurance · photos · cleaning · keys · choosing a manager</span></div>
      <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
        <span className="label" style={{ color: 'var(--brand)' }}>Free PDF</span>
        <h2 id="guide-h" style={{ margin: 0, fontSize: compact ? 20 : 'clamp(22px,3vw,28px)' }}>Get the short-term rental setup guide</h2>
        {state.ok ? (
          <div role="status" style={{ display: 'grid', gap: 8 }}>
            <p style={{ margin: 0 }}><b>It&apos;s yours.</b> We&apos;ve also emailed you the link, so you can come back to it.</p>
            {state.link && <a className="btn primary" href={state.link} style={{ justifySelf: 'start' }}>Download the guide (PDF)</a>}
          </div>
        ) : (
          <>
            {!compact && <p style={{ margin: 0, color: 'var(--muted)' }}>The rules for your state, a setup checklist and what to check when you compare managers, in one PDF. Free, and always up to date.</p>}
            <form action={act} className="guide-form">
              <input type="text" name="website_url" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} />
              <input className="field" name="first" placeholder="First name (optional)" aria-label="First name (optional)" autoComplete="given-name" />
              <input className="field" type="email" name="email" required placeholder="Email" aria-label="Email" autoComplete="email" />
              <select className="field" name="state" required defaultValue="" aria-label="State your property is in">
                <option value="" disabled>State your property is in</option>
                {STATES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
              <label className="guide-consent"><input type="checkbox" name="consent" value="yes" /> <span>Send me a few short emails to help me get set up (3 over two weeks). I can unsubscribe at any time.</span></label>
              <button className="btn primary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Get the free guide'}</button>
              {state.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{state.error}</p>}
              <p className="hint" style={{ margin: 0, fontSize: 12.5 }}>We use your email to send the guide and, if you tick the box, our setup tips. See our <a href="/privacy">privacy policy</a>.</p>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
