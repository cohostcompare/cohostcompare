'use client';

import Link from 'next/link';
import { useState } from 'react';
import QuoteBar from '@/components/QuoteBar';
import TrustBadges from '@/components/TrustBadges';
import { areaKey, usePicks } from '@/lib/client/picks';
import type { NearbyManager } from '@/lib/types';

const feeText = (m: NearbyManager) => (m.feeMin == null ? null : m.feeMin === m.feeMax || m.feeMax == null ? `${m.feeMin}%` : `${m.feeMin}–${m.feeMax}%`);

export default function ResultsList({ managers, query }: { managers: NearbyManager[]; query: string }) {
  const { picks, toggle, has, full } = usePicks(areaKey(query));
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <div className="results">
        {managers.map((m) => {
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
                <div className="meta">
                  {m.avgRating != null && <span><b>{m.avgRating.toFixed(2)} ★</b> from {m.reviewCount?.toLocaleString('en-AU')} reviews</span>}
                  {m.propertyCount != null && <span><b>{m.propertyCount}</b> Airbnb homes tracked</span>}
                </div>
                <div className="chips">{m.platforms.map((p) => <span className="chip" key={p}>{p}</span>)}{m.cities.map((c) => <span className="chip" key={c} style={{ background: 'transparent', border: '1px solid var(--line)' }}>{c}</span>)}</div>
              </div>
              <div className="side">
                <div className="fee">
                  {fee ? <><span className="n">{fee}</span><span className="s">management fee{m.claimed ? '' : ' (from their website)'}</span></> : <><span className="n" style={{ fontSize: 17 }}>Fee on request</span><span className="s">included in your quote</span></>}
                </div>
                <button type="button" className={`btn ${on ? 'primary' : 'secondary'} add above`} aria-pressed={on}
                  onClick={() => toggle({ slug: m.slug, name: m.name })} disabled={!on && full}>
                  {on ? '✓ Added to quote' : full ? '5 already picked' : '+ Add to quote'}
                </button>
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
        })}
      </div>
      <QuoteBar picks={picks} query={query} />
    </>
  );
}
