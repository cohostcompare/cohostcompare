'use client';

import { useActionState, useEffect, useState } from 'react';
import PlacesInput from '@/components/PlacesInput';
import { submitQuoteRequest } from './actions';
import { checkCoverage } from './coverage';
import { AVAILABILITY, PROPERTY_KEY, PROPERTY_TYPES, SITUATIONS, mismatches, type PropertyDetails, type Requirements } from '@/lib/requirements';

const SERVICES = ['Full management', 'Listing setup and photos', 'Pricing and guest messaging only', 'Cleaning and linen', 'Help registering the property'];
const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];
const L = { display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 } as const;
const grid = (min: number) => ({ display: 'grid', gap: 12, gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))` });

type Addr = { street: string; suburb: string; state: string; postcode: string; lat: number | null; lng: number | null };

type M = { slug: string; name: string; claimed?: boolean; requirements?: Requirements | null };

export default function QuoteForm({ managers, initial, email }: { managers: M[]; initial: Addr; email: string }) {
  const [state, action, pending] = useActionState(submitQuoteRequest, {});
  const [addr, setAddr] = useState<Addr>({ ...initial, state: initial.state || 'NSW' });
  const known = Boolean(initial.suburb && /^\d{4}$/.test(initial.postcode) && initial.lat != null);
  const [editing, setEditing] = useState(!known);
  const [removed, setRemoved] = useState<string[]>([]);
  // Property details: prefilled from what the owner told us on the results page (this browser only).
  const [ptype, setPtype] = useState<string>('Apartment');
  const [beds, setBeds] = useState<number>(2);
  const [avail, setAvail] = useState<string>('');
  const [services, setServices] = useState<string[]>([SERVICES[0]]);
  const [situation, setSituation] = useState<string>(SITUATIONS[0]);
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PROPERTY_KEY) || '{}') as PropertyDetails;
      if (p.type && (PROPERTY_TYPES as readonly string[]).includes(p.type)) setPtype(p.type);
      if (typeof p.beds === 'number') setBeds(p.beds);
      if (p.availability) setAvail(p.availability);
      if (p.services?.length && !p.services.includes(SERVICES[0])) setServices([]);
    } catch { /* none */ }
  }, []);
  const details: PropertyDetails = { type: ptype, beds, availability: avail || null, services, situation };
  // Keep the search results' "Your property" bar in step with changes made here.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(true); }, []);
  useEffect(() => {
    if (!loaded || !avail) return; // only once the owner has filled it in
    try { localStorage.setItem(PROPERTY_KEY, JSON.stringify({ type: ptype, beds, availability: avail || null, services: services.length ? (services.includes(SERVICES[0]) ? [SERVICES[0]] : ['Some services']) : null })); } catch { /* fine */ }
  }, [loaded, ptype, beds, avail, services]);
  const searchHref = `/search?${new URLSearchParams({ postcode: addr.postcode, ...(addr.suburb ? { suburb: addr.suburb } : {}), ...(addr.state ? { state: addr.state } : {}), ...(addr.street ? { street: addr.street } : {}), ...(addr.lat != null && addr.lng != null ? { lat: String(addr.lat), lng: String(addr.lng) } : {}) }).toString()}#your-property`;
  const toggleService = (s: string) => setServices(services.includes(s) ? services.filter((x) => x !== s) : [...services, s]);
  const active = managers.filter((m) => !removed.includes(m.slug));
  const located = addr.lat != null && addr.lng != null;
  const [coveredSlugs, setCoveredSlugs] = useState<string[] | null>(null);
  useEffect(() => {
    let live = true;
    setCoveredSlugs(null);
    if (located) checkCoverage(addr.lat!, addr.lng!, managers.map((m) => m.slug), addr.postcode).then((c) => { if (live) setCoveredSlugs(c); });
    return () => { live = false; };
  }, [addr.lat, addr.lng, addr.postcode, located, managers]);
  const checking = located && coveredSlugs === null;
  const uncovered = located && coveredSlugs ? active.filter((m) => !coveredSlugs.includes(m.slug)) : [];
  const coveredAll = located && coveredSlugs ? active.filter((m) => coveredSlugs.includes(m.slug)) : [];
  // Managers whose requirements this property doesn't meet can't be sent the request.
  const unfit = coveredAll.map((m) => ({ m, why: mismatches(m.requirements, details) })).filter((x) => x.why.length);
  const covered = coveredAll.filter((m) => !unfit.some((u) => u.m.slug === m.slug));
  // Typing over the suburb or postcode means we no longer know exactly where the property is.
  const set = (k: 'street' | 'suburb' | 'state' | 'postcode') => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddr({ ...addr, [k]: e.target.value, ...(k === 'suburb' || k === 'postcode' ? { lat: null, lng: null } : {}) });

  return (
    <form action={action} className="panel" style={{ display: 'grid', gap: 16 }}>
      <input type="hidden" name="managers" value={covered.map((m) => m.slug).join(',')} />
      <input type="hidden" name="lat" value={addr.lat ?? ''} />
      <input type="hidden" name="lng" value={addr.lng ?? ''} />
      <div style={grid(200)}>
        <label style={L}>Your name<input className="field" name="name" autoComplete="name" required /></label>
        <label style={L}>Email<input className="field" name="email" type="email" autoComplete="email" defaultValue={email} required /></label>
        <label style={L}>Phone (optional)<input className="field" name="phone" type="tel" autoComplete="tel" /></label>
      </div>
      <label style={L}>Which best describes you?
        <select className="field" name="situation" value={situation} onChange={(e) => setSituation(e.target.value)}>
          {SITUATIONS.map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>

      {!editing ? (
        <div style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Property</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px' }}>
            <span>{[addr.street, addr.suburb, `${addr.state} ${addr.postcode}`].filter(Boolean).join(', ')}</span>
            <button type="button" className="btn secondary" style={{ minHeight: 36, padding: '0 12px' }} onClick={() => setEditing(true)}>Change</button>
          </div>
          <input type="hidden" name="street" value={addr.street} />
          <input type="hidden" name="suburb" value={addr.suburb} />
          <input type="hidden" name="state" value={addr.state} />
          <input type="hidden" name="postcode" value={addr.postcode} />
        </div>
      ) : (
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Property address</legend>
        <PlacesInput kind="any" placeholder="Start typing the address or suburb to fill it in" onPick={(p) => setAddr({ street: p.street, suburb: p.suburb, state: p.state || addr.state, postcode: p.postcode, lat: p.lat ?? null, lng: p.lng ?? null })} />
        <label style={L}>Street address (optional if you haven&apos;t bought yet)<input className="field" name="street" value={addr.street} onChange={set('street')} autoComplete="address-line1" placeholder="Unit/number and street" /></label>
        <div style={grid(140)}>
          <label style={L}>Suburb<input className="field" name="suburb" value={addr.suburb} onChange={set('suburb')} autoComplete="address-level2" required /></label>
          <label style={L}>State
            <select className="field" name="state" value={addr.state} onChange={set('state')}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <label style={L}>Postcode<input className="field" name="postcode" value={addr.postcode} onChange={set('postcode')} inputMode="numeric" maxLength={4} autoComplete="postal-code" required /></label>
        </div>
      </fieldset>
      )}

      {!located && (
        <p role="status" style={{ margin: 0, color: 'var(--signal)' }}>Pick the address from the suggestions so we can check which managers cover it.</p>
      )}
      {covered.some((m) => !m.claimed) && (
        <p style={{ margin: 0, background: 'var(--surface)', borderRadius: 10, padding: '10px 14px' }}>
          <b>{covered.filter((m) => !m.claimed).map((m) => m.name).join(', ')} {covered.filter((m) => !m.claimed).length === 1 ? "hasn't" : "haven't"} joined CoHostCompare yet.</b> We&apos;ll invite {covered.filter((m) => !m.claimed).length === 1 ? 'them' : 'them'} to reply to your request, so {covered.filter((m) => !m.claimed).length === 1 ? 'their' : 'their'} quote may take longer, or may not come. Managers already on CoHostCompare reply here directly.
        </p>
      )}
      {uncovered.length > 0 && (
        <div role="alert" style={{ border: '1px solid var(--signal)', borderRadius: 10, padding: '12px 14px', display: 'grid', gap: 8 }}>
          <b>{uncovered.map((m) => m.name).join(' and ')} {uncovered.length === 1 ? "doesn't" : "don't"} run homes near {addr.suburb || 'this address'}.</b>
          <span className="hint">
            {covered.length
              ? `Remove ${uncovered.length === 1 ? 'them' : 'them'} to send your request to ${covered.map((m) => m.name).join(', ')} only, or search again for managers who cover this address.`
              : 'None of the managers you picked cover this address. Search again to find managers who do.'}
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {covered.length > 0 && <button type="button" className="btn secondary" onClick={() => setRemoved([...removed, ...uncovered.map((m) => m.slug)])}>Remove {uncovered.length === 1 ? uncovered[0].name : 'them'}</button>}
            <a className="btn secondary" href={`/search?${new URLSearchParams({ postcode: addr.postcode, ...(addr.suburb ? { suburb: addr.suburb } : {}), ...(addr.state ? { state: addr.state } : {}), ...(addr.street ? { street: addr.street } : {}), ...(located ? { lat: String(addr.lat), lng: String(addr.lng) } : {}) }).toString()}`}>Search managers for this address</a>
          </div>
        </div>
      )}
      <div style={grid(150)}>
        <label style={L}>Property type
          <select className="field" name="property_type" value={ptype} onChange={(e) => setPtype(e.target.value)}>{PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label style={L}>Bedrooms
          <select className="field" name="bedrooms" value={beds} onChange={(e) => setBeds(Number(e.target.value))}>{[0, 1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n === 0 ? 'Studio' : n === 6 ? '6+' : n}</option>)}</select>
        </label>
        <label style={L}>Available for guests
          <select className="field" name="availability" value={avail} onChange={(e) => setAvail(e.target.value)} required><option value="" disabled>Choose one</option>{AVAILABILITY.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}</select>
        </label>
      </div>
      <div style={grid(200)}>
        <label style={L}>Is it listed now?
          <select className="field" name="currently_listed"><option>Not yet listed</option><option>Listed, I manage it myself</option><option>Listed with another manager</option></select>
        </label>
        <label style={L}>When do you want to start?
          <select className="field" name="start_timing" defaultValue="In 1 to 3 months"><option>Within a month</option><option>In 1 to 3 months</option><option>In 3 to 12 months</option><option>Not sure yet</option></select>
        </label>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>What do you want help with?</legend>
        {SERVICES.map((s) => (
          <label key={s} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" name="services" value={s} checked={services.includes(s)} onChange={() => toggleService(s)} style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} /> {s}
          </label>
        ))}
      </fieldset>
      {unfit.length > 0 && (
        <div role="alert" style={{ border: '1px solid var(--signal)', borderRadius: 10, padding: '12px 14px', display: 'grid', gap: 8 }}>
          <b>{unfit.map((u) => u.m.name).join(' and ')} {unfit.length === 1 ? 'doesn’t' : 'don’t'} take on a property like this.</b>
          {unfit.map((u) => <span key={u.m.slug} className="hint">{u.m.name}: {u.why.join(' · ')}</span>)}
          <span className="hint">{covered.length ? `If these details are right, remove ${unfit.length === 1 ? 'them' : 'them'} and your request goes to ${covered.map((m) => m.name).join(', ')}.` : 'If these details are right, search again for managers who take on properties like yours.'} Or change the details above if you&apos;re happy to.</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {covered.length > 0 && <button type="button" className="btn secondary" onClick={() => setRemoved([...removed, ...unfit.map((u) => u.m.slug)])}>Remove {unfit.length === 1 ? unfit[0].m.name : 'them'}</button>}
            <a className="btn secondary" href={searchHref}>Back to search results to change your property</a>
          </div>
        </div>
      )}
      <label style={L}>Anything else managers should know? (optional)
        <textarea className="field" name="notes" rows={3} maxLength={2000} placeholder="For example: I use the place myself over Christmas." />
      </label>
      <button className="btn primary" type="submit" disabled={pending || checking || !located || uncovered.length > 0 || unfit.length > 0 || covered.length === 0 || !avail}>
        {pending ? 'Sending…' : checking ? 'Checking coverage…' : !avail ? 'Choose how much of the year it’s available' : `Send quote request${covered.length ? ` to ${covered.length} manager${covered.length === 1 ? '' : 's'}` : ''}`}
      </button>
      {state?.error && <p role="alert" style={{ color: 'var(--signal)', margin: 0 }}>{state.error}</p>}
      <p className="hint" style={{ margin: 0 }}>Managers see your property details and first name. Your email and phone are shared only with managers whose quote you accept. By sending, you agree to our <a href="/terms">terms</a>.</p>
    </form>
  );
}
