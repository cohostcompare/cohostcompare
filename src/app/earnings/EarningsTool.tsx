'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import PlacesInput, { type PickedPlace } from '@/components/PlacesInput';
import type { Estimate } from '@/lib/earnings';
import { getEstimate, type EstimateResult } from './actions';

const money = (n: number) => `A$${Math.round(n).toLocaleString('en-AU')}`;

export default function EarningsTool() {
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [beds, setBeds] = useState(2);
  const [res, setRes] = useState<EstimateResult | null>(null);
  const [pending, start] = useTransition();

  const run = (p: PickedPlace | null, b: number) => {
    if (!p || p.lat == null || p.lng == null) { setRes({ error: 'Pick an address or suburb from the suggestions.' }); return; }
    start(async () => setRes(await getEstimate(p.lat!, p.lng!, b)));
  };
  const q = place ? new URLSearchParams(Object.fromEntries(Object.entries({ postcode: place.postcode, suburb: place.suburb, state: place.state, street: place.street, lat: place.lat != null ? String(place.lat) : '', lng: place.lng != null ? String(place.lng) : '' }).filter(([, v]) => v)) as Record<string, string>) : null;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="panel earn-tool">
        <div className="earn-form">
          <h2>Get your estimate</h2>
          <fieldset className="beds">
            <legend>Bedrooms</legend>
            <div className="seg" role="radiogroup" aria-label="Bedrooms">
              {[0, 1, 2, 3, 4, 5].map((b) => (
                <button key={b} type="button" role="radio" aria-checked={beds === b} className={beds === b ? 'on' : ''}
                  onClick={() => { setBeds(b); if (place) run(place, b); }}>{b === 0 ? 'Studio' : b === 5 ? '5+' : b}</button>
              ))}
            </div>
          </fieldset>
          <div style={{ display: 'grid', gap: 6 }}>
            <label className="label" htmlFor="earn-addr">Property address or suburb</label>
            <PlacesInput id="earn-addr" kind="any" placeholder="Start typing an address or suburb" onPick={(p) => { setPlace(p); run(p, beds); }} buttonLabel={pending ? 'Working it out…' : 'Estimate earnings'} />
          </div>
          <ul className="earn-trust">
            <li>Free to use</li>
            <li>No account or sign-up</li>
            <li>No contact details asked for</li>
          </ul>
        </div>
        <aside className="earn-preview" aria-label="What the estimate shows">
          <span className="label">You&apos;ll see</span>
          <ul>
            <li><b>Yearly booking revenue</b><span>a likely range for your home</span></li>
            <li><b>Nights booked</b><span>the area average</span></li>
            <li><b>Typical nightly rate</b><span>for your number of bedrooms</span></li>
            <li><b>What you&apos;d keep</b><span>after a typical management fee</span></li>
          </ul>
        </aside>
      </div>

      {res && 'error' in res && (
        <p role="alert" className="panel" style={{ margin: 0, color: 'var(--signal)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{res.error}</span>
          {res.signin && <Link className="btn primary small" href="/signin?next=/earnings">Sign in free</Link>}
        </p>
      )}
      {res && 'mid' in res && (
        <section className="estimate" aria-live="polite">
          <span className="label">Estimated booking revenue for a {res.bedrooms === 0 ? 'studio' : `${res.bedrooms === 5 ? '5+' : res.bedrooms}-bedroom home`} in {res.market}</span>
          <div className="big">{money(res.low)} – {money(res.high)} <span>a year</span></div>
          <div className="facts">
            <div><b>{Math.round(res.occupancy * 100)}%</b><span>of nights booked, area average</span></div>
            <div><b>{money(res.nightly)}</b><span>typical nightly rate for this size</span></div>
            <div><b>{money(res.mid * 0.8)}</b><span>kept after a 20% management fee, before cleaning and other costs</span></div>
            {res.activeListings ? <div><b>{res.activeListings.toLocaleString('en-AU')}</b><span>active short-stay listings in the area</span></div> : null}
          </div>
          <p className="hint" style={{ margin: 0 }}>An estimate from area averages over the last 12 months, adjusted for bedrooms. Your home&apos;s actual earnings depend on its location, presentation, pricing and local rules. Data source: AirROI (www.airroi.com).</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {q && <Link className="btn primary" href={`/search?${q.toString()}`}>Compare managers near this address</Link>}
            <Link className="btn secondary" href="/rules">Check the rules first</Link>
          </div>
        </section>
      )}
    </div>
  );
}
