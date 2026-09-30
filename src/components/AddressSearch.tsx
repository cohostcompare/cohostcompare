'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import PlacesInput, { type PickedPlace } from './PlacesInput';

export default function AddressSearch() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pc, setPc] = useState('');
  const byPostcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pc)) { setError('Enter a 4-digit postcode.'); return; }
    router.push(`/search?postcode=${pc}`);
  };
  const postcodeBox = (
    <form className="search-row" onSubmit={byPostcode}>
      <input className="field" inputMode="numeric" maxLength={4} placeholder="Postcode, e.g. 2026" value={pc} onChange={(e) => setPc(e.target.value.replace(/\D/g, ''))} aria-label="Postcode" />
      <button className="btn primary" type="submit" style={{ flex: '0 0 auto' }}>Find managers</button>
    </form>
  );

  function go(p: PickedPlace) {
    setError('');
    if (!p.postcode) { setError('Pick an address or suburb from the list so we know its postcode.'); return; }
    const q = new URLSearchParams({ postcode: p.postcode });
    if (p.suburb) q.set('suburb', p.suburb);
    if (p.state) q.set('state', p.state);
    if (p.street) q.set('street', p.street);
    if (p.lat != null && p.lng != null) { q.set('lat', String(p.lat)); q.set('lng', String(p.lng)); }
    router.push(`/search?${q.toString()}`);
  }

  return (
    <div className="search">
      <label className="label" htmlFor="addr">Your property&apos;s address or suburb</label>
      <PlacesInput id="addr" kind="any" placeholder="Start typing an address or suburb" onPick={go} fallback={postcodeBox} buttonLabel="Find managers" />
      {error && <p className="hint" role="alert" style={{ color: 'var(--signal)', margin: 0 }}>{error}</p>}
      <p className="hint" style={{ margin: 0 }}>A full address gives the most accurate results. Buying? A suburb works too. Now covering Sydney and Melbourne.</p>
    </div>
  );
}
