'use client';

import { useState } from 'react';

const SUPABASE_URL = 'https://hkntldmrckaosytpjakw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_B_uAcWw-KxTeG-dGXqBG9A_1JWRrfNg';

export default function ManagerSignup() {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!d.business?.trim()) return setError('Enter your business name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) return setError('Enter a valid work email address.');
    setState('sending');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ type: 'manager', business: d.business, email: d.email, postcodes: d.postcodes, properties: d.properties, source: location.hostname }),
      });
      if (!res.ok) throw new Error();
      setState('done');
    } catch {
      setError("That didn't go through. Check your connection and try again.");
      setState('idle');
    }
  }

  if (state === 'done') return <div className="panel" style={{ background: 'var(--tint)' }}>Thanks. We&apos;ll email you a link to claim and edit your profile.</div>;

  return (
    <form className="panel" onSubmit={submit} noValidate style={{ display: 'grid', gap: 14 }}>
      <h2 style={{ fontSize: 22, margin: 0 }}>Claim your free listing</h2>
      <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>Business name<input name="business" autoComplete="organization" className="field" /></label>
      <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>Work email<input name="email" type="email" autoComplete="email" className="field" /></label>
      <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>Postcodes you service<input name="postcodes" placeholder="2026, 2024, 2034" className="field" /></label>
      <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>Properties managed
        <select name="properties" className="field"><option>1–10</option><option>11–50</option><option>51–200</option><option>200+</option></select>
      </label>
      <button className="btn primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Claim my free listing'}</button>
      {error && <p role="alert" style={{ color: 'var(--signal)', margin: 0 }}>{error}</p>}
      <p className="hint" style={{ margin: 0 }}>Free during launch. By signing up you agree to our <a href="/privacy">privacy policy</a>.</p>
    </form>
  );
}
