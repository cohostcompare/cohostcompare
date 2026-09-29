'use client';

import { useEffect, useRef, useState } from 'react';

// Public browser key, restricted to cohostcompare.com and *.vercel.app in Google Cloud.
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || 'AIzaSyBLavojOt_gK6BytzO1BJqrMwJ_574VWEg';

declare global {
  interface Window { __ccMapsLoading?: Promise<void>; google?: any } // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function loadMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (window.__ccMapsLoading) return window.__ccMapsLoading;
  window.__ccMapsLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&v=weekly&loading=async&libraries=places&region=AU&language=en-AU`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { window.__ccMapsLoading = undefined; reject(new Error('maps failed')); };
    document.head.appendChild(s);
  });
  return window.__ccMapsLoading;
}

export type PickedPlace = {
  formatted: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  lat?: number;
  lng?: number;
};

type Comp = { longText?: string; shortText?: string; types: string[] };

function parse(place: any): PickedPlace { // eslint-disable-line @typescript-eslint/no-explicit-any
  const comps: Comp[] = place.addressComponents || [];
  const get = (t: string, short = false) => { const c = comps.find((x) => x.types.includes(t)); return (short ? c?.shortText : c?.longText) || ''; };
  const unit = get('subpremise');
  const num = get('street_number');
  const route = get('route');
  const street = [unit && num ? `${unit}/${num}` : num, route].filter(Boolean).join(' ');
  return {
    formatted: place.formattedAddress || '',
    street,
    suburb: get('locality') || get('sublocality') || get('postal_town'),
    state: get('administrative_area_level_1', true),
    postcode: get('postal_code'),
    lat: place.location?.lat?.(),
    lng: place.location?.lng?.(),
  };
}

/**
 * Google address/suburb suggestions. Falls back to a plain text input if Google can't load.
 * kind="address": street addresses. kind="suburb": suburbs and postcodes.
 */
export default function PlacesInput({ kind, placeholder, onPick, id }: { kind: 'address' | 'suburb'; placeholder: string; onPick: (p: PickedPlace) => void; id?: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(async () => {
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary('places');
        if (cancelled || !holder.current) return;
        const el = new PlaceAutocompleteElement({
          includedRegionCodes: ['au'],
          includedPrimaryTypes: kind === 'address' ? ['street_address', 'premise', 'subpremise'] : ['locality', 'postal_code'],
        });
        if (id) el.id = id;
        el.setAttribute('placeholder', placeholder);
        el.addEventListener('gmp-select', async (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const place = e.placePrediction.toPlace();
          await place.fetchFields({ fields: ['formattedAddress', 'addressComponents', 'location'] });
          pickRef.current(parse(place));
        });
        holder.current.replaceChildren(el);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('failed'); });
    return () => { cancelled = true; };
  }, [kind, placeholder, id]);

  return (
    <div ref={holder} className="places">
      {status === 'loading' && <input className="field" disabled placeholder="Loading suggestions…" />}
      {status === 'failed' && <p className="hint" style={{ margin: 0 }}>Address suggestions aren&apos;t available right now. Type the details below instead.</p>}
    </div>
  );
}
