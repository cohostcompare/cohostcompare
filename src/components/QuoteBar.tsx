'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { MAX_PICKS, type Pick } from '@/lib/client/picks';

/** Fixed bar at the bottom: who's picked so far and the button to request quotes from them. */
export default function QuoteBar({ picks, query, backHref, emptyAction }: { picks: Pick[]; query: string; backHref?: string; emptyAction?: { label: string; href: string } }) {
  const q = new URLSearchParams(query);
  q.set('managers', picks.map((p) => p.slug).join(','));
  const ref = useRef<HTMLDivElement>(null);
  // Publish the bar's real height so pages can leave room for it (it grows on phones).
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const set = () => document.documentElement.style.setProperty('--qb-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set); ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty('--qb-h'); };
  }, []);
  return (
    <div className="quotebar" role="region" aria-label="Quote request" ref={ref}>
      <div className="wrap">
        <span style={{ minWidth: 0 }}>
          {picks.length === 0 ? `Pick up to ${MAX_PICKS} managers to request quotes from.` : <><b>{picks.length} of {MAX_PICKS} picked<span className="qb-names">:</span></b><span className="qb-names"> {picks.map((p) => p.name).join(', ')}</span></>}
          {picks.length === 1 && <span className="compare-tip">Pick one more to compare them side by side</span>}
          {backHref && <> · <Link href={backHref}>Back to results to add more</Link></>}
        </span>
        {picks.length ? (
          <span style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* With 2+ picked, comparing first is the main action; sending straight away is still one click. */}
            {picks.length > 1 ? (
              <>
                <Link className="linkish" href={`/quote?${q.toString()}`}>Skip to request {picks.length} quotes</Link>
                <Link className="btn primary btn-big" href={`/compare?${q.toString()}`}>Compare {picks.length} side by side →</Link>
              </>
            ) : (
              <Link className="btn primary" href={`/quote?${q.toString()}`}>Request a quote</Link>
            )}
          </span>
        ) : emptyAction ? (
          <a className="btn primary" href={emptyAction.href}>{emptyAction.label}</a>
        ) : (
          <button className="btn primary" type="button" disabled>Request a quote</button>
        )}
      </div>
    </div>
  );
}
