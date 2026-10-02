'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import QuoteBar from '@/components/QuoteBar';
import TrustBadges from '@/components/TrustBadges';
import { areaKey, usePicks } from '@/lib/client/picks';
import type { NearbyManager } from '@/lib/types';
import PropertyFields from '@/components/PropertyFields';
import { isComplete, useProperty } from '@/lib/client/property';
import { earningsHref, mismatches } from '@/lib/requirements';

const feeText = (m: NearbyManager) => (m.feeMin == null ? null : m.feeMin === m.feeMax || m.feeMax == null ? `${m.feeMin}%` : `${m.feeMin}–${m.feeMax}%`);

export default function ResultsList({ managers, query, fresh }: { managers: NearbyManager[]; query: string; fresh?: boolean }) {
  const { picks, toggle, has, full } = usePicks(areaKey(query));
  const [open, setOpen] = useState<string | null>(null);
  // The owner's property (src/lib/client/property.ts): remembered for owners, per tab for admins.
  const { prop, update } = useProperty(fresh);
  // All four property details are needed before any manager can be added to a quote.
  const complete = isComplete(prop);
  const barRef = useRef<HTMLElement>(null);
  const [nudge, setNudge] = useState(false);
  const askForDetails = () => {
    setNudge(true);
    barRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (barRef.current?.querySelector('select[data-empty="1"]') as HTMLSelectElement | null ?? barRef.current?.querySelector('select') as HTMLSelectElement | null)?.focus({ preventScroll: true });
    setTimeout(() => setNudge(false), 2400);
  };
  const why = new Map(managers.map((m) => [m.slug, complete ? mismatches(m.requirements, prop) : []]));
  // Sorting is the owner's choice; it never uses anything a manager pays for. Default: highest guest rating near you.
  const hasOwnerReviews = managers.some((m) => m.ownerReviews);
  const [sort, setSort] = useState<'rating' | 'overall' | 'homes' | 'nightly' | 'owner'>('rating');
  const val = (m: NearbyManager): number | null => sort === 'rating' ? (m.nearbyRating ?? m.avgRating ?? null) : sort === 'overall' ? (m.avgRating ?? null)
    : sort === 'homes' ? (m.nearby || null) : sort === 'nightly' ? (m.avgNightlyRate ?? null) : (m.ownerReviews?.avg ?? null);
  const sorted = managers.map((m, i) => ({ m, i })).sort((a, b) => {
    const x = val(a.m), y = val(b.m);
    if (x == null && y == null) return a.i - b.i;
    if (x == null) return 1;
    if (y == null) return -1;
    return y - x || (b.m.nearby || 0) - (a.m.nearby || 0) || a.i - b.i;
  }).map((x) => x.m);
  const fits = sorted.filter((m) => !why.get(m.slug)!.length);
  const others = sorted.filter((m) => why.get(m.slug)!.length);

  // "What could it earn?" nudge: if someone's been looking at results for a while without picking anyone.
  const qp = new URLSearchParams(query);
  const placeLabel = [qp.get('street'), qp.get('suburb')].filter(Boolean).join(', ') || (qp.get('postcode') ? `postcode ${qp.get('postcode')}` : '');
  const earnLink = earningsHref({ lat: qp.get('lat'), lng: qp.get('lng'), place: placeLabel, beds: prop.beds });
  const [earnNudge, setEarnNudge] = useState(false);
  useEffect(() => {
    if (!qp.get('lat')) return;
    try { if (sessionStorage.getItem('cc_earn_nudge')) return; } catch { /* fine */ }
    const t = setTimeout(() => setEarnNudge(true), 75000);
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeEarn = () => { setEarnNudge(false); try { sessionStorage.setItem('cc_earn_nudge', '1'); } catch { /* fine */ } };

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
                {m.nearby > 0 && <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--brand)', fontSize: 14 }}><span className={sort === 'homes' ? 'sort-hit' : undefined}><b>{m.nearby}</b> home{m.nearby === 1 ? '' : 's'} they run near you</span>{m.nearbyRating ? <> · <span className={sort === 'rating' ? 'sort-hit' : undefined}>{m.nearbyRating.toFixed(2)} ★ guest rating nearby</span></> : ''}</p>}
                {!m.propertyCount && <p className="hint" style={{ margin: '4px 0 0' }}>Covers this area, as stated on its website. No listing figures yet.</p>}
                {why.get(m.slug)!.length > 0 && <p className="mismatch">{why.get(m.slug)!.join(' · ')}</p>}
                <div className="meta">
                  {m.ownerReviews && <span><b style={{ color: '#B97C00' }}>{m.ownerReviews.avg.toFixed(1)} ★</b> from {m.ownerReviews.count} owner review{m.ownerReviews.count === 1 ? '' : 's'}</span>}
                  {m.avgRating != null && <span className={sort === 'overall' || (sort === 'rating' && !m.nearbyRating) ? 'sort-hit' : undefined}><b>{m.avgRating.toFixed(2)} ★</b> overall, from {m.reviewCount?.toLocaleString('en-AU')} reviews</span>}
                  {m.propertyCount != null && <span><b>{m.propertyCount}</b> Airbnb homes in total</span>}
                  {m.avgNightlyRate != null && <span className={sort === 'nightly' ? 'sort-hit' : undefined}><b>A${Math.round(m.avgNightlyRate)}</b> typical nightly rate</span>}
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
        <PropertyFields prop={prop} update={update} />
        {nudge && <p role="alert" className="prop-nudge">{complete ? 'Change any detail here and the list updates straight away.' : 'Add your property details here first, then you can add managers to your quote.'}</p>}
      </section>
      <div className="sort-row">
        <label>Sort by
          <select className="field" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="rating">Highest guest rating near you</option>
            <option value="overall">Highest guest rating overall</option>
            <option value="homes">Most homes they run near you</option>
            <option value="nightly">Highest typical nightly rate</option>
            {hasOwnerReviews && <option value="owner">Highest owner reviews</option>}
          </select>
        </label>
        <span className="hint">{sort === 'rating' ? 'Based on the homes each manager runs near this address (highlighted on each card).' : sort === 'overall' ? 'Based on all of each manager’s homes.' : sort === 'homes' ? 'Counts only the homes within 4 km of this address, not their whole portfolio (highlighted on each card).' : 'Highlighted on each card. Managers without this figure go last.'}</span>
      </div>
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
      {earnNudge && picks.length === 0 && (
        <aside className="earn-nudge" role="dialog" aria-label="Earnings estimate">
          <button type="button" className="x" aria-label="Close" onClick={closeEarn}>×</button>
          <b>While you compare: what could {placeLabel ? placeLabel.split(',')[0] : 'this property'} earn?</b>
          <span className="hint">A free estimate of yearly booking income for this address, from how similar homes nearby did over the last 12 months.</span>
          <a className="earn-pill" href={earnLink} onClick={closeEarn}>See what it could earn →</a>
        </aside>
      )}
      <QuoteBar picks={complete ? picks.filter((p) => !why.get(p.slug)?.length) : []} query={query} />
    </>
  );
}
