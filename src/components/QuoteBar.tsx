'use client';

import Link from 'next/link';
import { MAX_PICKS, type Pick } from '@/lib/client/picks';

/** Fixed bar at the bottom: who's picked so far and the button to request quotes from them. */
export default function QuoteBar({ picks, query, backHref }: { picks: Pick[]; query: string; backHref?: string }) {
  const q = new URLSearchParams(query);
  q.set('managers', picks.map((p) => p.slug).join(','));
  return (
    <div className="quotebar" role="region" aria-label="Quote request">
      <div className="wrap">
        <span style={{ minWidth: 0 }}>
          {picks.length === 0 ? `Pick up to ${MAX_PICKS} managers to request quotes from.` : <><b>{picks.length} of {MAX_PICKS} picked:</b> {picks.map((p) => p.name).join(', ')}</>}
          {backHref && <> · <Link href={backHref}>Back to results to add more</Link></>}
        </span>
        {picks.length ? (
          <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {picks.length > 1 && <Link className="btn secondary" href={`/compare?${q.toString()}`}>Compare {picks.length}</Link>}
            <Link className="btn primary" href={`/quote?${q.toString()}`}>Request {picks.length > 1 ? `${picks.length} quotes` : 'a quote'}</Link>
          </span>
        ) : (
          <button className="btn primary" type="button" disabled>Request a quote</button>
        )}
      </div>
    </div>
  );
}
