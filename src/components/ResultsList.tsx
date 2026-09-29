'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PublicManager } from '@/lib/types';

const MAX = 5;

export default function ResultsList({ managers, query }: { managers: PublicManager[]; query: string }) {
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
          return (
            <article key={m.slug} className={`card${on ? ' selected' : ''}`}>
              <div className="av" aria-hidden="true">{m.initials}</div>
              <div style={{ minWidth: 0 }}>
                <h2><Link href={`/managers/${m.slug}?${query}`}>{m.name}</Link> {m.demo && <span className="demo-flag">Demo</span>}</h2>
                <div className="meta">
                  {m.avgRating != null && <span><b>{m.avgRating.toFixed(2)} ★</b> from {m.reviewCount?.toLocaleString('en-AU')} guest reviews</span>}
                  {m.propertyCount != null && <span><b>{m.propertyCount}</b> properties managed</span>}
                  {m.responseHours != null && <span>Replies in about <b>{m.responseHours}h</b></span>}
                </div>
                <div className="chips">{m.platforms.map((p) => <span className="chip" key={p}>{p}</span>)}</div>
                <label className="pick">
                  <input type="checkbox" checked={on} onChange={() => toggle(m.slug)} disabled={!on && picked.length >= MAX} />
                  Add to my quote request
                </label>
              </div>
              <div className="fee">
                <span className="n">{m.feeMin === m.feeMax ? `${m.feeMin}%` : `${m.feeMin}–${m.feeMax}%`}</span>
                <span className="s">management fee<br /><Link href={`/managers/${m.slug}?${query}`}>Full fee breakdown</Link></span>
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
