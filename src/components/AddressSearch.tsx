'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Public browser key, restricted to cohostcompare.com and *.vercel.app in Google Cloud.
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || 'AIzaSyBLavojOt_gK6BytzO1BJqrMwJ_574VWEg';

type AddressComponent = { longText?: string; types: string[] };

declare global {
  interface Window { __ccMapsLoading?: Promise<void>; google?: any } // eslint-disable-line @typescript-eslint/no-explicit-any
}

function loadMaps(): Promise<void> {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (window.__ccMapsLoading) return window.__ccMapsLoading;
  window.__ccMapsLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&v=weekly&loading=async&libraries=places&region=AU&language=en-AU`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('maps failed'));
    document.head.appendChild(s);
  });
  return window.__ccMapsLoading;
}

export default function AddressSearch({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const holder = useRef<HTMLDivElement>(null);
  const [mapsOk, setMapsOk] = useState<boolean | null>(null);
  const [postcode, setPostcode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(async () => {
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary('places');
        if (cancelled || !holder.current) return;
        const el = new PlaceAutocompleteElement({ includedRegionCodes: ['au'], includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'] });
        el.setAttribute('placeholder', initial || 'Start typing your property address');
        el.addEventListener('gmp-select', async (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          setError('');
          const place = e.placePrediction.toPlace();
          await place.fetchFields({ fields: ['formattedAddress', 'addressComponents', 'location'] });
          const comps: AddressComponent[] = place.addressComponents || [];
          const pc = comps.find((c) => c.types.includes('postal_code'))?.longText;
          if (!pc) { setError('That address has no postcode. Try the full street address.'); return; }
          const q = new URLSearchParams({ postcode: pc, address: place.formattedAddress || '' });
          if (place.location) { q.set('lat', String(place.location.lat())); q.set('lng', String(place.location.lng())); }
          router.push(`/search?${q.toString()}`);
        });
        holder.current.replaceChildren(el);
        setMapsOk(true);
      })
      .catch(() => { if (!cancelled) setMapsOk(false); });
    return () => { cancelled = true; };
  }, [router, initial]);

  function byPostcode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(postcode)) { setError('Enter a 4-digit postcode.'); return; }
    router.push(`/search?postcode=${postcode}`);
  }

  return (
    <div className="search">
      <label className="label" htmlFor="pc">Your property&apos;s address</label>
      <div ref={holder} aria-live="polite">
        {mapsOk === null && <input disabled placeholder="Loading address search…" />}
      </div>
      <form className="search-row" onSubmit={byPostcode}>
        <input id="pc" inputMode="numeric" maxLength={4} placeholder={mapsOk === false ? 'Enter your postcode' : 'Or search by postcode'} value={postcode} onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ''))} />
        <button className="btn primary" type="submit" style={{ flex: '0 0 auto' }}>Find managers</button>
      </form>
      {error && <p className="hint" role="alert" style={{ color: 'var(--signal)', margin: 0 }}>{error}</p>}
      <p className="hint" style={{ margin: 0 }}>Now covering Sydney and Melbourne.</p>
    </div>
  );
}
