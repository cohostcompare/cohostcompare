'use client';

import { rankFlag, recommended } from '@/lib/recommend';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import QuoteBar from '@/components/QuoteBar';
import TrustBadges from '@/components/TrustBadges';
import { areaKey, usePicks } from '@/lib/client/picks';
import type { NearbyManager } from '@/lib/types';
import PropertyFields from '@/components/PropertyFields';
import { isComplete, useProperty } from '@/lib/client/property';
import { earningsHref, mismatches } from '@/lib/requirements';

const feeText = (m: NearbyManager) => (m.feeMin == null ? null : m.feeMin === m.feeMax || m.feeMax == null ? `${m.feeMin}%` : `${m.feeMin}–${m.feeMax}%`);

export default function ResultsList({ managers, query, fresh, feeHint }: { managers: NearbyManager[]; query: string; fresh?: boolean; feeHint?: string | null }) {
  const { picks, toggle, setAll, has, full } = usePicks(areaKey(query));
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  // The owner's property (src/lib/client/property.ts): remembered for owners, per tab for admins.
  const { prop, update } = useProperty(fresh);
  // Property details are optional here: once complete, managers who don't take that property move down. The quote form asks for them anyway.
  const complete = isComplete(prop);
  const barRef = useRef<HTMLElement>(null);
  const [nudge, setNudge] = useState(false);
  const askForDetails = () => {
    setNudge(true);
    barRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (barRef.current?.querySelector('select[data-empty="1"]') as HTMLSelectElement | null ?? barRef.current?.querySelector('select') as HTMLSelectElement | null)?.focus({ preventScroll: true });
    setTimeout(() => setNudge(false), 5000);
  };
  const why = new Map(managers.map((m) => [m.slug, complete ? mismatches(m.requirements, prop) : []]));
  // Sorting is the owner's choice; it never uses anything a manager pays for. Default: recommended (src/lib/recommend.ts).
  const hasOwnerReviews = managers.some((m) => m.ownerReviews);
  const [sort, setSort] = useState<'recommended' | 'rating' | 'overall' | 'homes' | 'nightly' | 'owner'>('recommended');
  const val = (m: NearbyManager): number | null => sort === 'rating' ? (m.nearbyRating ?? m.avgRating ?? null) : sort === 'overall' ? (m.avgRating ?? null)
    : sort === 'homes' ? (m.nearby || null) : sort === 'nightly' ? (m.avgNightlyRate ?? null) : (m.ownerReviews?.avg ?? null);
  const sorted = sort === 'recommended' ? recommended(managers) : managers.map((m, i) => ({ m, i })).sort((a, b) => {
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

  // Factual labels, worked out among the managers who can quote: each goes to one manager only, and only when it's a clear lead.
  const tags = new Map<string, string[]>();
  const tag = (slug: string, t: string) => tags.set(slug, [...(tags.get(slug) || []), t]);
  const lead = (xs: NearbyManager[], v: (m: NearbyManager) => number | null, dir: 1 | -1 = 1) => {
    const have = xs.map((m) => ({ m, x: v(m) })).filter((y): y is { m: NearbyManager; x: number } => y.x != null).sort((p, q) => dir * (q.x - p.x));
    return have.length > 1 && have[0].x !== have[1].x ? have[0].m : null;
  };
  const mostHomes = lead(fits, (m) => m.nearby || null);
  const bestRating = lead(fits.filter((m) => (m.nearby || 0) >= 3), (m) => m.nearbyRating);
  const lowestFee = lead(fits, (m) => m.feeMin, -1);
  if (mostHomes) tag(mostHomes.slug, 'Most homes near you');
  if (bestRating) tag(bestRating.slug, 'Highest guest rating near you');
  if (lowestFee) tag(lowestFee.slug, 'Lowest published fee');

  const card = (m: NearbyManager) => {
          const fee = feeText(m);
          const on = has(m.slug);
          const isOpen = open === m.slug;
          const profile = `/managers/${m.slug}?${query}`;
          const bad = why.get(m.slug)!;
          const rating = m.nearbyRating ?? m.avgRating ?? null;
          const ratingNear = m.nearbyRating != null;
          return (
            <article key={m.slug} className={`mrow clickable${on ? ' selected' : ''}${isOpen ? ' open' : ''}`}>
              <div className="mrow-id">
                <div className="av" aria-hidden="true" style={m.logoUrl ? { background: '#fff', border: '1px solid var(--line)' } : undefined}>{m.logoUrl ? <img src={m.logoUrl} alt="" style={{ objectFit: 'contain' }} /> : m.initials}</div>
                <div style={{ minWidth: 0 }}>
                  {/* The name stretches over the row: a click expands it here; ctrl/cmd-click opens the full profile in a new tab. */}
                  <h2><Link className="stretch" href={profile} aria-expanded={isOpen} onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault(); setOpen(isOpen ? null : m.slug);
                  }}>{m.name}</Link></h2>
                  <div className="mrow-sub">
                    {(tags.get(m.slug) || []).map((t) => <span key={t} className="mtag">{t}</span>)}
                    {(m.claimed || m.verified) && <TrustBadges m={m} compact />}
                    {m.slowReply && <span className="slow-note" style={{ margin: 0 }}>Not on CoHostCompare yet, so may be slow to reply</span>}
                    {m.ownerReviews && <span className="hint"><b style={{ color: 'var(--ink)' }}>{m.ownerReviews.avg.toFixed(1)} ★</b> from {m.ownerReviews.count} owner review{m.ownerReviews.count === 1 ? '' : 's'}</span>}
                    {!m.propertyCount && <span className="hint">Covers this area, as stated on its website</span>}
                  </div>
                  {bad.length > 0 && <p className="mismatch">{bad.join(' · ')}</p>}
                </div>
              </div>
              <dl className="mstats">
                <div className={sort === 'homes' ? 'hit' : undefined}><dt>Homes near you</dt><dd>{m.nearby > 0 ? m.nearby : <span className="none">–</span>}</dd></div>
                <div className={sort === 'rating' || sort === 'overall' ? 'hit' : undefined}><dt>Guest rating{rating != null && !ratingNear ? ', all homes' : ''}</dt><dd>{rating != null ? <>{(sort === 'overall' && m.avgRating != null ? m.avgRating : rating).toFixed(2)}<small> ★</small></> : <span className="none">–</span>}</dd></div>
                <div><dt>Fee</dt><dd>{fee ?? <span className="req">On request</span>}</dd></div>
              </dl>
              <div className="mrow-act">
                {bad.length ? (
                  <span className="btn secondary add above" aria-disabled="true" style={{ opacity: 0.6, pointerEvents: 'none' }}>Doesn&apos;t take this property</span>
                ) : (
                  <button type="button" className={`btn ${on ? 'primary' : 'secondary'} add above`} aria-pressed={on}
                    onClick={() => toggle({ slug: m.slug, name: m.name })} disabled={!on && full}>
                    {on ? '✓ Added' : full ? '5 already picked' : '+ Add to quote'}
                  </button>
                )}
                <span className="more" aria-hidden="true">{isOpen ? 'Less ↑' : 'Details ↓'}</span>
              </div>

              {isOpen && (
                <div className="expand">
                  {!m.claimed && <div><TrustBadges m={m} full /></div>}
                  {m.tagline && <p style={{ margin: 0, fontWeight: 600 }}>{m.tagline}</p>}
                  {m.about && <p style={{ margin: 0, maxWidth: '75ch' }}>{m.about}</p>}
                  <div className="facts">
                    {m.nearestKm != null && <div><b>{m.nearestKm} km</b><span>to their closest home</span></div>}
                    {m.avgRating != null && <div><b>{m.avgRating.toFixed(2)} ★</b><span>across all {m.propertyCount ?? ''} homes</span></div>}
                    {m.reviewCount != null && <div><b>{m.reviewCount.toLocaleString('en-AU')}</b><span>guest reviews</span></div>}
                    {m.avgNightlyRate != null && <div className={sort === 'nightly' ? 'hit' : undefined}><b>A${Math.round(m.avgNightlyRate)}</b><span>typical nightly rate</span></div>}
                    {m.licensedAgent && <div><b>Licensed</b><span>real estate agency</span></div>}
                  </div>
                  {(m.photos?.length ?? 0) > 0 && <div className="gallery" tabIndex={0} role="region" aria-label={`Photos of homes managed by ${m.name}`}>{m.photos!.slice(0, 4).map((p) => <img key={p} src={p} alt={`A home managed by ${m.name}`} loading="lazy" />)}</div>}
                  {(m.platforms.length > 0 || m.services.length > 0) && <div className="chips">{m.platforms.map((p) => <span className="chip" key={p}>{p}</span>)}{m.services.map((x) => <span className="chip" key={x} style={{ background: 'transparent', border: '1px solid var(--line)' }}>{x}</span>)}</div>}
                  {fee && !m.claimed && <p className="hint" style={{ margin: 0 }}>The fee is from their website, hasn&apos;t been confirmed by them, and GST isn&apos;t stated.</p>}
                  <div className="actions">
                    <Link className="btn secondary" href={profile}>View full profile →</Link>
                    <button type="button" className="linkish" onClick={() => setOpen(null)} style={{ marginLeft: 'auto' }}>Show less</button>
                  </div>
                </div>
              )}
            </article>
          );
  };

  // Shortlist first: five rows are comparable at a glance; the rest are one tap away. Anyone already picked always shows.
  const SHORT = 5;
  const short = showAll || fits.length <= SHORT + 1 ? fits : fits.filter((m, i) => i < SHORT || has(m.slug));
  const hidden = fits.length - short.length;
  const topN = fits.filter((m) => !rankFlag(m)).slice(0, 3);

  return (
    <>
      <section ref={barRef} id="your-property" className={`prop-bar${complete ? ' done' : ''}${nudge ? ' nudge' : ''}`} aria-label="Your property">
        <div>
          <b id="prop-step">{complete ? 'Your property' : 'Your property (optional)'}</b>
          <span className="hint">{complete ? 'Change anything and the list updates.' : 'Add these to hide managers who don’t take homes like yours.'}</span>
        </div>
        <PropertyFields prop={prop} update={update} />
        {nudge && <p role="alert" className="prop-nudge">Change any detail here and the list updates straight away.</p>}
      </section>
      {complete && (
        <div className="fit-banner" role="status">
          <span><b>{fits.length} manager{fits.length === 1 ? '' : 's'}</b> {fits.length === 1 ? 'takes' : 'take'} on a property like yours and can quote.</span>
          {others.length > 0 && <a href="#not-matching">{others.length} {others.length === 1 ? 'doesn’t' : 'don’t'} match your property. See why ↓</a>}
        </div>
      )}
      <div className="list-head">
        <div>
          <h2>{hidden > 0 ? `Top ${short.length} of ${fits.length} for this address` : `${fits.length} manager${fits.length === 1 ? '' : 's'} for this address`}</h2>
          <details className="how-ranked">
            <summary>How is this ranked?</summary>
            <p>{sort === 'recommended' ? 'Recommended is a blend of guest rating (50%), homes they run near you (30%), being on CoHostCompare to reply (10%) and owner reviews (10%). Hotels and serviced apartments are never in the top 3.' : sort === 'rating' ? 'By the guest rating of the homes each manager runs within 4 km of this address.' : sort === 'overall' ? 'By the guest rating across all of each manager’s homes.' : sort === 'homes' ? 'By the homes each manager runs within 4 km of this address, not their whole portfolio.' : 'Managers without this figure go last.'} No one can pay to rank higher.</p>
          </details>
        </div>
        <label className="sort-pick">Sort
          <select className="field" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="recommended">Recommended</option>
            <option value="rating">Guest rating near you</option>
            <option value="overall">Guest rating overall</option>
            <option value="homes">Homes near you</option>
            <option value="nightly">Nightly rate</option>
            {hasOwnerReviews && <option value="owner">Owner reviews</option>}
          </select>
        </label>
      </div>
      {picks.length === 0 && topN.length > 1 && (
        <div className="top-pick">
          <button type="button" className="btn primary btn-big" onClick={() => {
            const top = topN.map((m) => ({ slug: m.slug, name: m.name }));
            setAll(top);
            const q = new URLSearchParams(query); q.set('managers', top.map((p) => p.slug).join(','));
            router.push(`/quote?${q.toString()}`);
          }}>Get quotes from the top {topN.length} →</button>
          <span className="hint">Free, and no sales calls. Or pick your own below, up to five.</span>
        </div>
      )}
      <div className="results" style={others.length || hidden > 0 ? { paddingBottom: 8 } : undefined}>
        {short.map(card)}
      </div>
      {hidden > 0 && (
        <p className="show-all"><button type="button" className="btn secondary" onClick={() => setShowAll(true)}>Show all {fits.length} managers</button></p>
      )}
      {others.length > 0 && (
        <section id="not-matching" style={{ display: 'grid', gap: 12, marginTop: 8, scrollMarginTop: 90 }}>
          <div className="others-head">
            <h2 style={{ fontSize: 20, margin: 0 }}>Also in this area, but {others.length === 1 ? 'doesn’t' : 'don’t'} take on a property like yours</h2>
            <span className="hint" style={{ fontSize: 15 }}>Each one shows why. Change your property details and they&apos;ll move up.</span>
            <div><a className="btn secondary" href="#your-property" onClick={(e) => { e.preventDefault(); askForDetails(); }}>↑ Update your property details</a></div>
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
      <QuoteBar picks={picks.filter((p) => !why.get(p.slug)?.length)} query={query} />
    </>
  );
}
