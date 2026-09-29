'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { NearbyManager } from '@/lib/types';

const MAX = 5;
const pct = (v: number | null) => (v == null ? null : `${Math.round(v * 100)}%`);

export default function ResultsList({ managers, query }: { managers: NearbyManager[]; query: string }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);

  function toggle(slug: string) {
    setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : p.length >= MAX ? p : [...p, slug]));
  }

  return (
    <>
      <div className="results">
        {managers.map((m) => {
          const on = picked.includes(m.slug);
          const fee = m.feeMin == null ? null : m.feeMin === m.feeMax || m.feeMax == null ? `${m.feeMin}%` : `${m.feeMin}–${m.feeMax}%`;
          return (
            <article key={m.slug} className={`card clickable${on ? ' selected' : ''}`}>
              <div className="av" aria-hidden="true" style={m.tile ? { background: m.tile.bg, color: m.tile.fg } : undefined}>{m.initials}</div>
              <div style={{ minWidth: 0 }}>
                {/* The name link stretches over the whole card, so anywhere on it opens the profile. */}
                <h2><Link className="stretch" href={`/managers/${m.slug}?${query}`}>{m.name}</Link></h2>
                {m.nearby > 0 && <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--brand)', fontSize: 14 }}>{m.nearby} home{m.nearby === 1 ? '' : 's'} managed near you{m.nearbyRating ? ` · ${m.nearbyRating.toFixed(2)} ★ nearby` : ''}</p>}
                <div className="meta">
                  {m.avgRating != null && <span><b>{m.avgRating.toFixed(2)} ★</b> from {m.reviewCount?.toLocaleString('en-AU')} reviews</span>}
                  {m.propertyCount != null && <span><b>{m.propertyCount}</b> homes tracked</span>}
                  {m.avgOccupancy != null && <span><b>{pct(m.avgOccupancy)}</b> nights booked</span>}
                </div>
                <div className="chips">{m.platforms.map((p) => <span className="chip" key={p}>{p}</span>)}{m.cities.map((c) => <span className="chip" key={c} style={{ background: 'transparent', border: '1px solid var(--line)' }}>{c}</span>)}</div>
                <label className="pick above">
                  <input type="checkbox" checked={on} onChange={() => toggle(m.slug)} disabled={!on && picked.length >= MAX} />
                  Add to my quote request
                </label>
              </div>
              <div className="fee">
                {fee ? <><span className="n">{fee}</span><span className="s">management fee</span></> : <><span className="n" style={{ fontSize: 17 }}>Fee on request</span><span className="s">included in your quote</span></>}
                <span className="more" aria-hidden="true">View profile →</span>
              </div>
            </article>
          );
        })}
      </div>
      <div className="quotebar" role="region" aria-label="Quote request">
        <div className="wrap">
          <span>{picked.length === 0 ? `Pick up to ${MAX} managers to request quotes from.` : `${picked.length} of ${MAX} picked.`}</span>
          <button className="btn primary" disabled={picked.length === 0} onClick={() => router.push(`/quote?managers=${picked.join(',')}&${query}`)}>
            Request {picked.length > 1 ? `${picked.length} quotes` : 'a quote'}
          </button>
        </div>
      </div>
    </>
  );
}
