'use client';

import { useEffect, useRef, useState } from 'react';

// Public browser key, restricted to cohostcompare.com and *.vercel.app in Google Cloud.
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || 'AIzaSyBLavojOt_gK6BytzO1BJqrMwJ_574VWEg';

declare global {
  interface Window { __ccMapsLoading?: Promise<void>; google?: any } // eslint-disable-line @typescript-eslint/no-explicit-any
}

let mapsError = '';
function watchMapsErrors() {
  if (typeof window === 'undefined' || (window as any).__ccWatch) return; // eslint-disable-line @typescript-eslint/no-explicit-any
  (window as any).__ccWatch = true; // eslint-disable-line @typescript-eslint/no-explicit-any
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    const m = String(args[0] ?? '').match(/Google Maps JavaScript API error: (\w+)/);
    if (m) { mapsError = m[1]; window.dispatchEvent(new Event('cc-maps-error')); }
    orig.apply(console, args as []);
  };
  (window as any).gm_authFailure = () => { mapsError = mapsError || 'AuthFailure'; window.dispatchEvent(new Event('cc-maps-error')); }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function loadMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  watchMapsErrors();
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (window.__ccMapsLoading) return window.__ccMapsLoading;
  window.__ccMapsLoading = new Promise((resolve, reject) => {
    // Google calls this once the library is fully ready (the script's onload can fire earlier).
    (window as any).__ccMapsReady = () => resolve(); // eslint-disable-line @typescript-eslint/no-explicit-any
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&v=weekly&loading=async&libraries=places&region=AU&language=en-AU&callback=__ccMapsReady`;
    s.async = true;
    s.onerror = () => { window.__ccMapsLoading = undefined; reject(new Error('Google script blocked')); };
    document.head.appendChild(s);
    setTimeout(() => reject(new Error('Google took too long to load')), 15000);
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

type Pred = { placePrediction: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const TYPES = {
  address: ['street_address', 'premise', 'subpremise'],
  suburb: ['locality', 'postal_code'],
  any: ['street_address', 'premise', 'subpremise', 'locality', 'postal_code'],
};

/**
 * Address/suburb box with Google suggestions (Places API New), in our own input so we can:
 * - search on Enter or with a button even if the person never picks from the list (we use the top suggestion),
 * - pick straight away when they choose a suggestion.
 * Falls back to `fallback` if Google can't load.
 */
export default function PlacesInput({ kind, placeholder, onPick, id, fallback, buttonLabel, label }: { kind: 'address' | 'suburb' | 'any'; placeholder: string; onPick: (p: PickedPlace) => void; id?: string; fallback?: React.ReactNode; buttonLabel?: string; label?: string }) {
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const lib = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const token = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const seq = useRef(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const [items, setItems] = useState<Pred[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const listId = `${id || 'places'}-list`;

  useEffect(() => {
    const onErr = () => { setCode(mapsError); setStatus('failed'); };
    window.addEventListener('cc-maps-error', onErr);
    if (mapsError) onErr();
    return () => window.removeEventListener('cc-maps-error', onErr);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(async () => {
        const places = await window.google.maps.importLibrary('places');
        if (cancelled) return;
        lib.current = places;
        token.current = new places.AutocompleteSessionToken();
        setStatus('ready');
      })
      .catch((e) => { if (!cancelled) { setCode(mapsError || String(e?.message || e)); setStatus('failed'); } });
    return () => { cancelled = true; };
  }, []);

  async function suggest(input: string): Promise<Pred[]> {
    if (!lib.current || input.trim().length < 3) return [];
    const { suggestions } = await lib.current.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input, includedRegionCodes: ['au'], includedPrimaryTypes: TYPES[kind], sessionToken: token.current, language: 'en-AU', region: 'au',
    });
    return (suggestions || []).filter((x: Pred) => x.placePrediction).slice(0, 6);
  }

  useEffect(() => {
    if (status !== 'ready') return;
    const n = ++seq.current;
    const t = setTimeout(async () => {
      try { const r = await suggest(text); if (n === seq.current) { setItems(r); setActive(-1); } } catch { /* ignore */ }
    }, 180);
    return () => clearTimeout(t);
  }, [text, status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function choose(p: Pred) {
    setBusy(true); setOpen(false); setMsg('');
    try {
      const place = p.placePrediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'addressComponents', 'location'] });
      const picked = parse(place);
      setText(picked.formatted || p.placePrediction.text?.toString() || text);
      token.current = new lib.current.AutocompleteSessionToken();
      pickRef.current(picked);
    } catch { setMsg('We couldn’t look up that address. Try again.'); }
    finally { setBusy(false); }
  }

  /** Search button or Enter: use the highlighted suggestion, otherwise the best match for what they typed. */
  async function go() {
    if (active >= 0 && items[active]) return choose(items[active]);
    if (text.trim().length < 3) { setMsg('Type an address or suburb first.'); return; }
    setBusy(true);
    const r = items.length ? items : await suggest(text).catch(() => []);
    setBusy(false);
    if (r[0]) return choose(r[0]);
    setMsg('We couldn’t find that. Check the spelling, or try the suburb and postcode.');
  }

  if (status === 'failed') return <>{fallback ?? null}{code && <p className="hint" style={{ margin: 0, fontSize: 12 }}>Suggestions unavailable ({code}).</p>}</>;

  return (
    <div className="pl">
      <div className="pl-row">
        <div className="pl-box">
          <input id={id} aria-label={label} className="field" type="text" autoComplete="off" placeholder={status === 'loading' ? 'Loading…' : placeholder}
            role="combobox" aria-expanded={open && items.length > 0} aria-controls={listId} aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            value={text} disabled={status === 'loading'}
            onChange={(e) => { setText(e.target.value); setOpen(true); setMsg(''); }}
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
              else if (e.key === 'Enter') { e.preventDefault(); go(); }
              else if (e.key === 'Escape') setOpen(false);
            }} />
          {open && items.length > 0 && (
            <ul id={listId} role="listbox" className="pl-list">
              {items.map((p, i) => (
                <li key={i} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={i === active ? 'on' : ''}
                  onMouseDown={(e) => { e.preventDefault(); choose(p); }} onMouseEnter={() => setActive(i)}>
                  <b>{p.placePrediction.mainText?.toString() || p.placePrediction.text?.toString()}</b>
                  <span>{p.placePrediction.secondaryText?.toString() || ''}</span>
                </li>
              ))}
              <li className="pl-attrib" aria-hidden="true">Suggestions by Google</li>
            </ul>
          )}
        </div>
        {buttonLabel && <button type="button" className="btn primary" onClick={go} disabled={busy || status !== 'ready'} style={{ flex: '0 0 auto' }}>{busy ? 'Searching…' : buttonLabel}</button>}
      </div>
      {msg && <p role="alert" className="hint" style={{ margin: 0, color: 'var(--signal)' }}>{msg}</p>}
    </div>
  );
}
