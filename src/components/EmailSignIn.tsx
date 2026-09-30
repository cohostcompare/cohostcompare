'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/config';

// Social sign-in buttons appear once each provider is switched on in Supabase and listed in NEXT_PUBLIC_AUTH_PROVIDERS (e.g. "google,azure").
const PROVIDERS = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS || '').split(',').map((p) => p.trim()).filter((p) => ['google', 'azure', 'apple'].includes(p)) as ('google' | 'azure' | 'apple')[];
const LABEL = { google: 'Google', azure: 'Microsoft', apple: 'Apple' };
const ICON = {
  google: <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>,
  azure: <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true"><path fill="#F35325" d="M1 1h10v10H1z"/><path fill="#81BC06" d="M12 1h10v10H12z"/><path fill="#05A6F0" d="M1 12h10v10H1z"/><path fill="#FFBA08" d="M12 12h10v10H12z"/></svg>,
  apple: <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.6-3.9zM14 5.5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4z"/></svg>,
};

export default function EmailSignIn({ next = '/account', intro, mode = 'signin' }: { next?: string; intro?: string; mode?: 'signin' | 'signup' }) {
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

  async function social(provider: 'google' | 'azure' | 'apple') {
    setError('');
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`, ...(provider === 'azure' ? { scopes: 'email' } : {}) } });
    if (error) setError(`We couldn't start ${LABEL[provider]} sign-in. Use your email instead.`);
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
      {PROVIDERS.length > 0 && (
        <>
          {PROVIDERS.map((p) => (
            <button key={p} type="button" className="btn secondary" onClick={() => social(p)} style={{ gap: 10 }}>{ICON[p]} Continue with {LABEL[p]}</button>
          ))}
          <div className="or"><span>or use your email</span></div>
        </>
      )}
      <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 }}>
        Email
        <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button className="btn primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : mode === 'signup' ? 'Create my free account' : 'Email me a sign-in link'}</button>
      {error && <p role="alert" style={{ color: 'var(--signal)', margin: 0 }}>{error}</p>}
      <p className="hint" style={{ margin: 0 }}>{mode === 'signup' ? 'We’ll email you a link to finish. ' : ''}No password needed. Free for owners. By continuing you agree to our <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.</p>
    </form>
  );
}
