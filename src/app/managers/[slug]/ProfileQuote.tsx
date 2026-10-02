'use client';

import Link from 'next/link';
import PropertyFields from '@/components/PropertyFields';
import QuoteBar from '@/components/QuoteBar';
import { areaKey, usePicks } from '@/lib/client/picks';
import { useProperty } from '@/lib/client/property';
import { mismatches, type Requirements } from '@/lib/requirements';

/** Sidebar on a profile: add this manager to the same quote list as the results page, then keep browsing. */
export default function ProfileQuote({ slug, name, query, requirements, fresh }: { slug: string; name: string; query: string; requirements?: Requirements | null; fresh?: boolean }) {
  const fromSearch = new URLSearchParams(query).has('lat') || new URLSearchParams(query).has('postcode');
  const { picks, toggle, has, full } = usePicks(areaKey(query));
  // Same rule as the results page: property details first, and only managers who take on that property.
  const { prop, update, complete } = useProperty(fresh);
  const why = complete ? mismatches(requirements, prop) : [];
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
        {!complete ? (
          <div className="prop-bar" style={{ margin: 0 }}>
            <div><b>First, your property</b><span className="hint">So we can check {name} takes on a property like yours.</span></div>
            <PropertyFields prop={prop} update={update} />
          </div>
        ) : why.length ? (
          <div style={{ display: 'grid', gap: 6 }}>
            <p className="mismatch" style={{ margin: 0 }}>{name} doesn&apos;t take on a property like yours: {why.join(' · ')}</p>
            <details><summary className="hint" style={{ cursor: 'pointer' }}>Change your property details</summary><div style={{ marginTop: 8 }}><PropertyFields prop={prop} update={update} /></div></details>
          </div>
        ) : null}
        <button type="button" className={`btn ${on ? 'primary' : 'secondary'}`} aria-pressed={on} disabled={!complete || why.length > 0 || (!on && full)} onClick={() => toggle({ slug, name })}>
          {on ? '✓ Added to quote' : !complete ? 'Add your property details first' : why.length ? 'Doesn’t take this property' : full ? '5 already picked' : '+ Add to quote'}
        </button>
        <Link className="btn secondary" href={back}>← Back to results</Link>
        <p className="hint" style={{ margin: 0 }}>Your contact details are only shared with a manager if you accept their quote.</p>
      </div>
      <QuoteBar picks={complete ? picks : []} query={query} backHref={complete && picks.length && picks.length < 5 ? back : undefined} />
    </>
  );
}
