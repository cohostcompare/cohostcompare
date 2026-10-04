import type { Metadata } from 'next';
import Link from 'next/link';
import TrustBadges from '@/components/TrustBadges';
import { feeLabel, gatedDetails, managersForArea, publicManager, withTestForAdmin } from '@/lib/data';
import { describe } from '@/lib/requirements';
import { withRequirements } from '@/lib/requirementsServer';
import { withReviewSummaries } from '@/lib/reviews';
import { currentUser } from '@/lib/supabase/server';
import type { GatedDetails, NearbyManager, PublicManager } from '@/lib/types';
import RemoveFromCompare from './RemoveFromCompare';

export const metadata: Metadata = { title: 'Compare your shortlist', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SP = Promise<Record<string, string | undefined>>;
type M = (NearbyManager | (PublicManager & { nearby?: number; nearbyRating?: number | null; nearestKm?: number | null })) & { ownerReviews?: { avg: number; count: number } };

/*
 Side-by-side view of the managers an owner has picked (2 to 5), before they request quotes.
 Neutral: same rows for everyone, in the order they were picked; small factual tags only (lowest fee, most homes nearby, highest rating nearby).
*/
export default async function Compare({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const slugs = (sp.managers || '').split(',').filter(Boolean).slice(0, 5);
  const lat = Number(sp.lat), lng = Number(sp.lng);
  const hasPoint = Boolean(sp.lat && sp.lng && Number.isFinite(lat) && Number.isFinite(lng));
  const area = hasPoint ? await withTestForAdmin(await managersForArea(lat, lng, sp.postcode)) : [];
  const found: M[] = [];
  for (const s of slugs) {
    const near = area.find((m) => m.slug === s);
    const m = near ?? (await publicManager(s));
    if (m) found.push(m as M);
  }
  const ms = await (await import('@/lib/reach')).withReach(await withRequirements(await withReviewSummaries(found)));
  const user = await currentUser();
  const gated = new Map<string, GatedDetails | null>();
  if (user) for (const m of ms) gated.set(m.slug, await gatedDetails(m.slug));

  const keep = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== 'managers') as [string, string][]);
  const results = `/search?${keep.toString()}`;
  const withOnly = (list: string[]) => { const q = new URLSearchParams(keep); q.set('managers', list.join(',')); return q.toString(); };
  const signIn = `/signin?next=${encodeURIComponent(`/compare?${withOnly(slugs)}`)}`;

  // Factual tags (never a ranking): lowest published fee, most homes nearby, highest guest rating nearby.
  const minFee = Math.min(...ms.map((m) => (m.feeMin == null ? Infinity : m.feeMin)));
  const maxNear = Math.max(...ms.map((m) => m.nearby ?? 0));
  const maxRating = Math.max(...ms.map((m) => m.nearbyRating ?? 0));
  const tag = (on: boolean, label: string) => (on && ms.length > 1 ? <span className="cmp-tag">{label}</span> : null);
  const dash = <span className="hint">Not published</span>;

  type Row = { label: string; cell: (m: M) => React.ReactNode; locked?: boolean };
  const rows: Row[] = [
    { label: 'Management fee (% of booking income)', cell: (m) => <>{feeLabel(m) ?? <span className="hint">On request</span>}{tag(m.feeMin != null && m.feeMin === minFee, 'lowest')}{!m.claimed && feeLabel(m) ? <div className="hint">from their website</div> : null}</> },
    { label: 'Homes they run near you', cell: (m) => <>{m.nearby ? <b>{m.nearby}</b> : <span className="hint">None tracked</span>}{tag(Boolean(m.nearby) && m.nearby === maxNear, 'most')}{m.nearestKm != null ? <div className="hint">closest {m.nearestKm} km away</div> : null}</> },
    { label: 'Guest rating near you', cell: (m) => <>{m.nearbyRating ? <b>{m.nearbyRating.toFixed(2)} ★</b> : <span className="hint">–</span>}{tag(Boolean(m.nearbyRating) && m.nearbyRating === maxRating, 'highest')}</> },
    { label: 'Guest rating overall', cell: (m) => (m.avgRating != null ? <>{m.avgRating.toFixed(2)} ★ <div className="hint">{m.reviewCount?.toLocaleString('en-AU')} reviews</div></> : <span className="hint">–</span>) },
    { label: 'Owner reviews', cell: (m) => (m.ownerReviews ? <>{m.ownerReviews.avg.toFixed(1)} ★ <div className="hint">{m.ownerReviews.count} review{m.ownerReviews.count === 1 ? '' : 's'}</div></> : <span className="hint">None yet</span>) },
    { label: 'Airbnb homes tracked', cell: (m) => m.propertyCount ?? <span className="hint">–</span> },
    { label: 'Typical nightly rate', cell: (m) => (m.avgNightlyRate != null ? `A$${Math.round(m.avgNightlyRate)}` : <span className="hint">–</span>) },
    { label: 'Setup fee', locked: true, cell: (m) => { const g = gated.get(m.slug); return g?.setupNote ?? (g?.setupFee == null ? dash : g.setupFee === 0 ? 'None' : `A$${g.setupFee}`); } },
    { label: 'Minimum term', locked: true, cell: (m) => { const g = gated.get(m.slug); return g?.minTermMonths == null ? dash : g.minTermMonths === 0 ? 'No lock-in' : `${g.minTermMonths} months`; } },
    { label: 'Notice to leave', locked: true, cell: (m) => { const g = gated.get(m.slug); return g?.noticeDays == null ? dash : `${g.noticeDays} days`; } },
    { label: 'Cleaning and linen', locked: true, cell: (m) => { const g = gated.get(m.slug); return g?.cleaningPassedOn == null ? dash : `${g.cleaningPassedOn ? 'Charged to guests' : 'Charged to you'}${g.linenIncluded ? ', linen included' : ''}`; } },
    { label: 'Using it yourself', locked: true, cell: (m) => gated.get(m.slug)?.ownerStaysAllowed ?? dash },
    { label: 'Platforms', cell: (m) => m.platforms.join(', ') || <span className="hint">–</span> },
    { label: 'Services', cell: (m) => (m.services.length ? m.services.join(', ') : <span className="hint">–</span>) },
    { label: 'What they take on', cell: (m) => (m.requirements ? describe(m.requirements).join('. ') || <span className="hint">Any property</span> : <span className="hint">Any property</span>) },
  ];

  return (
    <main style={{ paddingBlock: '16px 120px', display: 'grid', gap: 16 }}>
      <Link href={results} className="hint">← Back to results</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(28px,4.4vw,40px)', margin: 0 }}>Compare your shortlist</h1>
          <p className="hint" style={{ margin: '4px 0 0' }}>Side by side, in the order you picked them. Remove any you&apos;re not keen on, then request quotes from the rest. Fees here are what managers publish; your quotes show exactly what they&apos;d charge for your property.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ms.length < 5 && <Link className="btn secondary" href={results}>+ Add more managers</Link>}
          {ms.length > 0 && <Link className="btn primary" href={`/quote?${withOnly(ms.map((m) => m.slug))}`}>Request {ms.length > 1 ? `${ms.length} quotes` : 'a quote'}</Link>}
        </div>
      </div>
      {!ms.length ? <p className="panel" style={{ margin: 0 }}>Nothing to compare yet. <Link href={results}>Pick managers from your results</Link>.</p> : (
        <div className="cmp-wrap">
          <table className="cmp" style={{ minWidth: `calc(var(--cmp-label, 160px) + ${ms.length * 150}px)` }}>
            <thead>
              <tr>
                <th scope="col" className="cmp-corner"><span className="hint">{ms.length} manager{ms.length === 1 ? '' : 's'}</span></th>
                {ms.map((m) => (
                  <th key={m.slug} scope="col">
                    <div className="cmp-head">
                      {ms.length > 1 && <RemoveFromCompare slug={m.slug} name={m.name} href={`/compare?${withOnly(ms.filter((x) => x.slug !== m.slug).map((x) => x.slug))}`} />}
                      <div className="av" aria-hidden="true" style={m.logoUrl ? { background: '#fff', border: '1px solid var(--line)' } : m.tile ? { background: m.tile.bg, color: m.tile.fg } : undefined}>{m.logoUrl ? <img src={m.logoUrl} alt="" style={{ objectFit: 'contain' }} /> : m.initials}</div>
                      <Link href={`/managers/${m.slug}?${keep.toString()}`} className="cmp-name">{m.name}</Link>
                      {(m.claimed || m.verified) && <TrustBadges m={m} compact />}
                      {m.slowReply && <span className="slow-note">May be slow to reply</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {r.locked && !user
                    ? (r.label === 'Setup fee' ? <td colSpan={ms.length} rowSpan={5} className="cmp-locked"><b>Setup fee, minimum term, notice period, cleaning and owner stays</b><span className="hint">Free for signed-in owners.</span><Link className="btn secondary small" href={signIn}>Sign in free to see them</Link></td> : null)
                    : ms.map((m) => <td key={m.slug}>{r.cell(m)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="hint" style={{ margin: 0 }}>Ratings, home counts and nightly rates are estimates from managers&apos; public listings over the last 12 months. Data source: AirROI (<a href="https://www.airroi.com">www.airroi.com</a>). No manager can pay to appear here or for a better position.</p>
    </main>
  );
}
