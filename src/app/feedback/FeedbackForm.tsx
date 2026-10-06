'use client';
import { useActionState, useState } from 'react';
import { sendFeedback } from './actions';

const EASE = ['Very hard', 'Hard', 'OK', 'Easy', 'Very easy'];
const HEARD = ['Google search', 'Google ad', 'LinkedIn', 'Facebook or Instagram', 'A friend or colleague', 'A manager sent me', 'News or a blog', 'Other'];

export default function FeedbackForm({ role, signedIn, page, minGenuine, reward }: { role: 'owner' | 'manager' | 'visitor'; signedIn: boolean; page?: string; minGenuine: number; reward: string | null }) {
  const [state, act, pending] = useActionState(sendFeedback, {});
  const [ease, setEase] = useState<number | null>(null);
  const [nps, setNps] = useState<number | null>(null);
  const [improve, setImprove] = useState('');
  const short = reward && improve.trim().length < minGenuine;
  return (
    <form action={act} className="panel feedback-form" style={{ display: 'grid', gap: 20 }}>
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} />
      {page && <input type="hidden" name="page" value={page} />}
      <input type="hidden" name="ease" value={ease ?? ''} /><input type="hidden" name="nps" value={nps ?? ''} />

      <fieldset><legend>How easy has CoHostCompare been to use?</legend>
        <div className="scale">{EASE.map((w, i) => <button key={w} type="button" aria-pressed={ease === i + 1} className={ease === i + 1 ? 'on' : ''} onClick={() => setEase(i + 1)}>{w}</button>)}</div>
      </fieldset>

      <fieldset><legend>How likely are you to recommend us to {role === 'manager' ? 'another manager' : 'another owner'}?</legend>
        <div className="scale nps">{Array.from({ length: 11 }, (_, n) => <button key={n} type="button" aria-pressed={nps === n} aria-label={`${n} out of 10`} className={nps === n ? 'on' : ''} onClick={() => setNps(n)}>{n}</button>)}</div>
        <div className="scale-ends"><span>Not likely</span><span>Very likely</span></div>
      </fieldset>

      <label><span>What&apos;s one thing we should improve or add?</span>
        <textarea name="improve" rows={4} required maxLength={3000} value={improve} onChange={(e) => setImprove(e.target.value)}
          placeholder={role === 'manager' ? 'e.g. the quote form, the leads you get, your profile, the dashboard, pricing…' : 'e.g. finding managers, comparing quotes, the information on profiles, anything that felt slow or unclear…'} />
        {short && <span className="hint">A sentence or two (at least {minGenuine} characters) qualifies for the thank-you.</span>}
      </label>

      <label><span>Was anything confusing, or did anything nearly stop you? <i className="hint">(optional)</i></span>
        <textarea name="confusing" rows={3} maxLength={3000} /></label>

      <label><span>{role === 'manager' ? 'What would make Pro worth paying for?' : 'Is there anything you wish we had?'} <i className="hint">(optional)</i></span>
        <textarea name="wish" rows={3} maxLength={3000} /></label>

      <label><span>How did you first hear about us? <i className="hint">(optional)</i></span>
        <select name="heard_from" className="field" defaultValue=""><option value="">Choose one</option>{HEARD.map((h) => <option key={h}>{h}</option>)}</select></label>

      {!signedIn && <label><span>Your email <i className="hint">(optional, if you&apos;d like a reply)</i></span><input className="field" type="email" name="email" /></label>}
      <label className="check"><input type="checkbox" name="contact_ok" /> I&apos;m happy for CoHostCompare to contact me about my feedback</label>

      {state.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{state.error}</p>}
      <button className="btn primary" type="submit" disabled={pending} style={{ justifySelf: 'start' }}>{pending ? 'Sending…' : 'Send feedback'}</button>
    </form>
  );
}
