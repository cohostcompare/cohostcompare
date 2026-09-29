'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import PlacesInput, { type PickedPlace } from './PlacesInput';

export default function AddressSearch() {
  const router = useRouter();
  const [error, setError] = useState('');

  function go(p: PickedPlace, withAddress: boolean) {
    setError('');
    if (!p.postcode) { setError(withAddress ? 'That address has no postcode. Try the full street address.' : 'Pick a suburb from the list so we know its postcode.'); return; }
    const q = new URLSearchParams({ postcode: p.postcode });
    if (p.suburb) q.set('suburb', p.suburb);
    if (p.state) q.set('state', p.state);
    if (withAddress && p.street) q.set('street', p.street);
    if (p.lat != null && p.lng != null) { q.set('lat', String(p.lat)); q.set('lng', String(p.lng)); }
    router.push(`/search?${q.toString()}`);
  }

  return (
    <div className="search">
      <label className="label" htmlFor="addr">Your property&apos;s address</label>
      <PlacesInput id="addr" kind="address" placeholder="Start typing your property address" onPick={(p) => go(p, true)} />
      <div className="label" style={{ marginTop: 6 }}>Or search by suburb</div>
      <PlacesInput kind="suburb" placeholder="Suburb or postcode, e.g. Bondi Beach" onPick={(p) => go(p, false)} />
      {error && <p className="hint" role="alert" style={{ color: 'var(--signal)', margin: 0 }}>{error}</p>}
      <p className="hint" style={{ margin: 0 }}>Now covering Sydney and Melbourne.</p>
    </div>
  );
}
