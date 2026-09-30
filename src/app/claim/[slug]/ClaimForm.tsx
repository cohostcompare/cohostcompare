'use client';

import { useActionState } from 'react';
import { submitClaim } from '../actions';

const L = { display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 } as const;

export default function ClaimForm({ slug, name, email, instant }: { slug: string; name: string; email: string; instant: boolean }) {
  const [state, action, pending] = useActionState(submitClaim, {});
  return (
    <form action={action} className="panel" style={{ display: 'grid', gap: 14 }}>
      <input type="hidden" name="slug" value={slug} />
      <p style={{ margin: 0 }}>Signed in as <b>{email}</b>.{' '}
        {instant ? <>This matches {name}&apos;s website, so you&apos;ll be approved <b>instantly</b>.</> : <>This doesn&apos;t match {name}&apos;s website, so we&apos;ll check your claim by hand, usually within one business day.</>}
      </p>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <label style={L}>Your name<input className="field" name="name" autoComplete="name" required /></label>
        <label style={L}>Your role<input className="field" name="role" placeholder="e.g. Director, Operations manager" autoComplete="organization-title" /></label>
      </div>
      <label style={L}>Phone (optional, helps us verify you)<input className="field" name="phone" type="tel" autoComplete="tel" /></label>
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <input type="checkbox" name="authorised" style={{ width: 18, height: 18, marginTop: 3, accentColor: 'var(--brand)' }} />
        <span>I work for {name}, I&apos;m authorised to manage its profile, and I agree to the <a href="/terms">terms for managers</a>.</span>
      </label>
      <button className="btn primary" type="submit" disabled={pending}>{pending ? 'Submitting…' : instant ? 'Claim and open my dashboard' : 'Submit my claim'}</button>
      {state?.error && <p role="alert" style={{ color: 'var(--signal)', margin: 0 }}>{state.error}</p>}
    </form>
  );
}
