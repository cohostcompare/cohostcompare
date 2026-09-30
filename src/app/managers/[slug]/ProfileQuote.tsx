'use client';

import Link from 'next/link';
import QuoteBar from '@/components/QuoteBar';
import { areaKey, usePicks } from '@/lib/client/picks';

/** Sidebar on a profile: add this manager to the same quote list as the results page, then keep browsing. */
export default function ProfileQuote({ slug, name, query }: { slug: string; name: string; query: string }) {
  const fromSearch = new URLSearchParams(query).has('lat') || new URLSearchParams(query).has('postcode');
  const { picks, toggle, has, full } = usePicks(areaKey(query));
  const on = has(slug);
  const back = `/search?${query}`;
  const direct = new URLSearchParams(query); direct.set('managers', slug);

  if (!fromSearch) {
    return (
      <div className="panel" style={{ display: 'grid', gap: 12 }}>
        <div className="label">Interested?</div>
        <p style={{ margin: 0 }}>Describe your property once and get a quote in a standard format you can compare with other managers.</p>
        <Link className="btn primary" href={`/quote?${direct.toString()}`}>Request a quote</Link>
        <p className="hint" style={{ margin: 0 }}>Want to compare? <Link href="/">Search your address</Link> to see every manager near your property and add up to 5 to one request.</p>
      </div>
    );
  }
  return (
    <>
      <div className="panel" style={{ display: 'grid', gap: 12 }}>
        <div className="label">Compare quotes</div>
        <p style={{ margin: 0 }}>Add {name} to your quote request, then go back and add up to {5 - picks.length + (on ? 1 : 0)} more. You describe your property once.</p>
        <button type="button" className={`btn ${on ? 'primary' : 'secondary'}`} aria-pressed={on} disabled={!on && full} onClick={() => toggle({ slug, name })}>
          {on ? '✓ Added to quote' : full ? '5 already picked' : '+ Add to quote'}
        </button>
        <Link className="btn secondary" href={back}>← Back to results</Link>
        <p className="hint" style={{ margin: 0 }}>Your contact details are only shared with a manager if you accept their quote.</p>
      </div>
      <QuoteBar picks={picks} query={query} backHref={picks.length && picks.length < 5 ? back : undefined} />
    </>
  );
}
