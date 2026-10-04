'use client';

import { useActionState, useEffect, useState } from 'react';
import { findManagers, requestProfile, type Found } from '@/app/managers/actions';

const L = { display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 } as const;

/** "Find your profile": search published managers by name and go to the claim page. Below it, a short form for businesses we haven't listed yet. */
export default function ManagerSignup() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Found[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [state, act, pending] = useActionState(requestProfile, {});

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) { setResults(null); return; }
    setSearching(true);
    const t = setTimeout(() => {
      findManagers(text).then((r) => { setResults(r); setSearching(false); }, () => { setResults([]); setSearching(false); });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="panel" style={{ display: 'grid', gap: 14 }}>
      <h2 style={{ fontSize: 22, margin: 0 }}>Find your profile</h2>
      <p className="hint" style={{ margin: '-6px 0 0' }}>Most managers already have a profile. Search for your business name, then claim it for free.</p>
      <label style={L}>Business name
        <input className="field" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="organization" placeholder="e.g. Harbourline Stays" aria-controls="find-results" />
      </label>
      <div id="find-results" aria-live="polite">
        {searching && results === null ? <p className="hint" style={{ margin: 0 }}>Searching…</p>
          : results && results.length ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
              {results.map((m) => (
                <li key={m.slug}>
                  <a href={`/claim/${m.slug}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', textDecoration: 'none', color: 'inherit', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 10 }}>
                    <span><b>{m.name}</b>{m.cities.length ? <span className="hint"> · {m.cities.slice(0, 2).join(', ')}</span> : null}</span>
                    <span style={{ color: 'var(--brand)', fontWeight: 600, whiteSpace: 'nowrap' }}>Claim →</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : results && !searching ? <p className="hint" style={{ margin: 0 }}>No profile matches &ldquo;{q.trim()}&rdquo;. Try a shorter name, or tell us about your business below.</p> : null}
      </div>
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Can&apos;t find your business?</summary>
        {state.ok ? <p style={{ margin: '10px 0 0', background: 'var(--tint)', borderRadius: 10, padding: '12px 14px' }}>Thanks. We&apos;ll build your profile and email you a claim link within two business days.</p> : (
          <form action={act} style={{ display: 'grid', gap: 12, marginTop: 10 }}>
            <input type="text" name="website_url" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} />
            <label style={L}>Business name<input className="field" name="business" autoComplete="organization" required maxLength={160} /></label>
            <label style={L}>Website<input className="field" name="website" type="url" autoComplete="url" placeholder="https://" maxLength={120} /></label>
            <label style={L}>Work email<input className="field" name="email" type="email" autoComplete="email" required /></label>
            <label style={L}>Areas you serve<input className="field" name="areas" placeholder="e.g. Byron Bay and the Northern Rivers" required maxLength={300} /></label>
            <button className="btn primary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Ask us to build my profile'}</button>
            {state.error && <p role="alert" style={{ color: 'var(--signal)', margin: 0 }}>{state.error}</p>}
          </form>
        )}
      </details>
      <p className="hint" style={{ margin: 0 }}>Your profile and replies are free. Paid plans are optional. See our <a href="/privacy">privacy policy</a>.</p>
    </div>
  );
}
