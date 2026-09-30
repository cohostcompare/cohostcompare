'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/config';

export default function EmailSignIn({ next = '/account', intro }: { next?: string; intro?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.');
    setState('sending');
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
    });
    if (error) { setState('idle'); setError(error.status === 429 ? 'Too many attempts. Wait a minute and try again.' : "We couldn't send the email. Check the address and try again."); return; }
    setState('sent');
  }

  if (state === 'sent') {
    return (
      <div className="panel" style={{ background: 'var(--tint)' }}>
        <b>Check your inbox.</b> We&apos;ve sent a sign-in link to {email}. Open it on this device to carry on. It can take a minute, so check spam if it hasn&apos;t arrived.
      </div>
    );
  }

  return (
    <form className="panel" onSubmit={send} noValidate style={{ display: 'grid', gap: 12 }}>
      {intro && <p style={{ margin: 0 }}>{intro}</p>}
      <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>
        Email
        <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button className="btn primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}</button>
      {error && <p role="alert" style={{ color: 'var(--signal)', margin: 0 }}>{error}</p>}
      <p className="hint" style={{ margin: 0 }}>No password needed. Free for owners. By continuing you agree to our <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.</p>
    </form>
  );
}
