'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import QuoteBar from '@/components/QuoteBar';
import TrustBadges from '@/components/TrustBadges';
import { areaKey, usePicks } from '@/lib/client/picks';
import type { NearbyManager } from '@/lib/types';
import { AVAILABILITY, FULL, PROPERTY_KEY, PROPERTY_TYPES, mismatches, type PropertyDetails } from '@/lib/requirements';

const feeText = (m: NearbyManager) => (m.feeMin == null ? null : m.feeMin === m.feeMax || m.feeMax == null ? `${m.feeMin}%` : `${m.feeMin}–${m.feeMax}%`);

export default function ResultsList({ managers, query }: { managers: NearbyManager[]; query: string }) {
  const { picks, toggle, has, full } = usePicks(areaKey(query));
  const [open, setOpen] = useState<string | null>(null);
  // The owner's property, remembered in this browser and passed on to the quote form.
  const [prop, setProp] = useState<PropertyDetails>({});
  useEffect(() => { try { setProp(JSON.parse(localStorage.getItem(PROPERTY_KEY) || '{}') || {}); } catch { /* none */ } }, []);
  const update = (k: keyof PropertyDetails, v: unknown) => {
    const next = { ...prop, [k]: v === '' ? null : v } as PropertyDetails;
    setProp(next);
    try { localStorage.setItem(PROPERTY_KEY, JSON.stringify(next)); } catch { /* fine */ }
  };
  // All four property details are needed before any manager can be added to a quote.
  const complete = Boolean(prop.type && prop.beds != null && (prop.beds as unknown) !== '' && prop.availability && prop.services?.length);
  const barRef = useRef<HTMLElement>(null);
  const [nudge, setNudge] = useState(false);
  const askForDetails = () => {
    setNudge(true);
    barRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (barRef.current?.querySelector('select[data-empty="1"]') as HTMLSelectElement | null ?? barRef.current?.querySelector('select') as HTMLSelectElement | null)?.focus({ preventScroll: true });
    setTimeout(() => setNudge(false), 2400);
  };
  const why = new Map(managers.map((m) => [m.slug, complete ? mismatches(m.requirements, prop) : []]));
  const fits = managers.filter((m) => !why.get(m.slug)!.length);
  const others = managers.filter((m) => why.get(m.slug)!.length);

  const card = (m: NearbyManager) => {
          const fee = feeText(m);
          const on = has(m.slug);
          const isOpen = open === m.slug;
          const profile = `/managers/${m.slug}?${query}`;
          return (
            <article key={m.slug} className={`card clickable${on ? ' selected' : ''}${isOpen ? ' open' : ''}`}>
              <div className="av" aria-hidden="true" style={m.logoUrl ? { background: '#fff', border: '1px solid var(--line)' } : m.tile ? { background: m.tile.bg, color: m.tile.fg } : undefined}>{m.logoUrl ? <img src={m.logoUrl} alt="" style={{ objectFit: 'contain' }} /> : m.initials}</div>
              <div style={{ minWidth: 0 }}>
                {/* The name stretches over the card: a click expands it here; ctrl/cmd-click opens the full profile in a new tab. */}
                <h2><Link className="stretch" href={profile} aria-expanded={isOpen} onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                  e.preventDefault(); setOpen(isOpen ? null : m.slug);
                }}>{m.name}</Link></h2>
                {(m.claimed || m.verified) && <div style={{ margin: '4px 0 2px' }}><TrustBadges m={m} compact /></div>}
                {m.nearby > 0 && <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--brand)', fontSize: 14 }}>{m.nearby} home{m.nearby === 1 ? '' : 's'} managed near you{m.nearbyRating ? ` · ${m.nearbyRating.toFixed(2)} ★ nearby` : ''}</p>}
                {!m.propertyCount && <p className="hint" style={{ margin: '4px 0 0' }}>Covers this area, as stated on its website. No listing figures yet.</p>}
                {why.get(m.slug)!.length > 0 && <p className="mismatch">{why.get(m.slug)!.join(' · ')}</p>}
                <div className="meta">
                  {m.ownerReviews && <span><b style={{ color: '#B97C00' }}>{m.ownerReviews.avg.toFixed(1)} ★</b> from {m.ownerReviews.count} owner review{m.ownerReviews.count === 1 ? '' : 's'}</span>}
                  {m.avgRating != null && <span><b>{m.avgRating.toFixed(2)} ★</b> from {m.reviewCount?.toLocaleString('en-AU')} reviews</span>}
                  {m.propertyCount != null && <span><b>{m.propertyCount}</b> Airbnb homes tracked</span>}
                </div>
                <div className="chips">{m.platforms.map((p) => <span className="chip" key={p}>{p}</span>)}{m.cities.map((c) => <span className="chip" key={c} style={{ background: 'transparent', border: '1px solid var(--line)' }}>{c}</span>)}</div>
              </div>
              <div className="side">
                <div className="fee">
                  {fee ? <><span className="n">{fee}</span><span className="s">management fee{m.claimed ? '' : ' (from their website)'}</span></> : <><span className="n" style={{ fontSize: 17 }}>Fee on request</span><span className="s">included in your quote</span></>}
                </div>
                {!complete ? (
                  <button type="button" className="btn secondary add above has-tip" onClick={askForDetails} data-tip="Add your property details at the top first, so we can check this manager takes on a property like yours" aria-describedby="prop-step">+ Add to quote</button>
                ) : why.get(m.slug)!.length ? (
                  <span className="btn secondary add above" aria-disabled="true" style={{ opacity: 0.6, pointerEvents: 'none' }}>Doesn&apos;t take this property</span>
                ) : (
                <button type="button" className={`btn ${on ? 'primary' : 'secondary'} add above`} aria-pressed={on}
                  onClick={() => toggle({ slug: m.slug, name: m.name })} disabled={!on && full}>
                  {on ? '✓ Added to quote' : full ? '5 already picked' : '+ Add to quote'}
                </button>
                )}
                <span className="more" aria-hidden="true">{isOpen ? 'Show less ↑' : 'More details ↓'}</span>
              </div>

              {isOpen && (
                <div className="expand">
                  {!m.claimed && <div><TrustBadges m={m} full /></div>}
                  {m.tagline && <p style={{ margin: 0, fontWeight: 600 }}>{m.tagline}</p>}
                  {m.about && <p style={{ margin: 0, maxWidth: '75ch' }}>{m.about}</p>}
                  <div className="facts">
                    {m.nearestKm != null && <div><b>{m.nearestKm} km</b><span>to their closest home</span></div>}
                    {m.avgNightlyRate != null && <div><b>A${Math.round(m.avgNightlyRate)}</b><span>average nightly rate</span></div>}
                    {m.reviewCount != null && <div><b>{m.reviewCount.toLocaleString('en-AU')}</b><span>guest reviews</span></div>}
                    {m.licensedAgent && <div><b>Licensed</b><span>real estate agency</span></div>}
                  </div>
                  {(m.photos?.length ?? 0) > 0 && <div className="gallery">{m.photos!.slice(0, 4).map((p) => <img key={p} src={p} alt={`A home managed by ${m.name}`} loading="lazy" />)}</div>}
                  {m.services.length > 0 && <div><div className="label">Services</div><div className="chips" style={{ marginTop: 6 }}>{m.services.map((s) => <span className="chip" key={s}>{s}</span>)}</div></div>}
                  <div className="actions">
                    <Link className="btn primary" href={profile}>View full profile →</Link>
                    <span className="hint">Map of where they operate, full fees and contract terms, and how they perform near you.</span>
                    <button type="button" className="linkish" onClick={() => setOpen(null)} style={{ marginLeft: 'auto' }}>Show less</button>
                  </div>
                </div>
              )}
            </article>
          );
  };

  return (
    <>
      <section ref={barRef} id="your-property" className={`prop-bar${complete ? ' done' : ''}${nudge ? ' nudge' : ''}`} aria-label="Your property">
        <div>
          <b id="prop-step">{complete ? 'Your property' : 'Step 1: tell us about your property'}</b>
          <span className="hint">{complete ? 'Change anything here and the list updates straight away.' : 'Some managers only take on certain properties. Add these four details to see who can quote, then add up to 5 managers to your quote.'}</span>
        </div>
        <div className="prop-fields">
          <label>Type<select className="field" data-empty={prop.type ? undefined : '1'} value={prop.type || ''} onChange={(e) => update('type', e.target.value)}><option value="" disabled>Choose</option>{PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>Bedrooms<select className="field" data-empty={prop.beds != null ? undefined : '1'} value={prop.beds ?? ''} onChange={(e) => update('beds', Number(e.target.value))}><option value="" disabled>Choose</option>{[0, 1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n === 0 ? 'Studio' : n === 6 ? '6+' : n}</option>)}</select></label>
          <label>Available for guests<select className="field" data-empty={prop.availability ? undefined : '1'} value={prop.availability || ''} onChange={(e) => update('availability', e.target.value)}><option value="" disabled>Choose</option>{AVAILABILITY.map((a) => <option key={a.v} value={a.v}>{a.label.replace(' (for example, holidays only)', '')}</option>)}</select></label>
          <label>Help wanted<select className="field" data-empty={prop.services?.length ? undefined : '1'} value={prop.services?.length ? (prop.services.includes(FULL) ? 'full' : 'some') : ''} onChange={(e) => update('services', e.target.value === 'full' ? [FULL] : ['Some services'])}><option value="" disabled>Choose</option><option value="full">Full management</option><option value="some">Only some services</option></select></label>
        </div>
        {nudge && <p role="alert" className="prop-nudge">{complete ? 'Change any detail here and the list updates straight away.' : 'Add your property details here first, then you can add managers to your quote.'}</p>}
      </section>
      {complete && (
        <div className="fit-banner" role="status">
          <span><b>{fits.length} manager{fits.length === 1 ? '' : 's'}</b> {fits.length === 1 ? 'takes' : 'take'} on a property like yours and can quote.</span>
          {others.length > 0 && <a href="#not-matching">{others.length} {others.length === 1 ? 'doesn’t' : 'don’t'} match your property. See why ↓</a>}
        </div>
      )}
      <div className="results" style={others.length ? { paddingBottom: 8 } : undefined}>
        {fits.map(card)}
      </div>
      {others.length > 0 && (
        <section id="not-matching" style={{ display: 'grid', gap: 12, marginTop: 8, scrollMarginTop: 90 }}>
          <div className="others-head">
            <h2 style={{ fontSize: 20, margin: 0 }}>Also in this area, but {others.length === 1 ? 'doesn’t' : 'don’t'} take on a property like yours</h2>
            <span className="hint" style={{ fontSize: 15 }}>These managers run homes near you, but their requirements don&apos;t match your property. Each one shows why. If you&apos;re happy to change something, like how much of the year it&apos;s available, update your property details and they&apos;ll move up.</span>
            <div><a className="btn primary" href="#your-property" onClick={(e) => { e.preventDefault(); askForDetails(); }}>↑ Update your property details</a></div>
          </div>
          <div className="results others">{others.map(card)}</div>
        </section>
      )}
      <QuoteBar picks={complete ? picks.filter((p) => !why.get(p.slug)?.length) : []} query={query} />
    </>
  );
}
