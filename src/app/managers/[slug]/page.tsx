import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AreaMap from '@/components/AreaMap';
import TrustBadges from '@/components/TrustBadges';
import ProfileQuote from './ProfileQuote';
import { COVER_KM, feeLabel, gatedDetails, managerAreas, managersNear, publicManager } from '@/lib/data';
import { currentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type P = Promise<{ slug: string }>;
type SP = Promise<{ postcode?: string; street?: string; suburb?: string; state?: string; lat?: string; lng?: string }>;

const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const NOT_PUBLISHED = <span style={{ color: 'var(--muted)' }}>Not published yet: ask in your quote request</span>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const m = await publicManager((await params).slug);
  if (!m) return {};
  return {
    title: `${m.name}: short-term rental manager in ${m.cities.join(' and ')}`,
    description: `${m.name}: ${m.propertyCount ? `${m.propertyCount} homes tracked` : 'short-term rental manager'}${m.avgRating ? `, rated ${m.avgRating.toFixed(2)} by guests` : ''}. Compare with other managers and request a quote.`,
  };
}

export default async function ManagerPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const m = await publicManager((await params).slug);
  if (!m) notFound();
  const sp = await searchParams;
  const user = await currentUser();
  const g = user ? await gatedDetails(m.slug) : null;
  const lat = Number(sp.lat), lng = Number(sp.lng);
  const near = user && sp.lat && sp.lng && Number.isFinite(lat) && Number.isFinite(lng) ? (await managersNear(lat, lng)).find((x) => x.slug === m.slug) : undefined;
  const q = new URLSearchParams({ managers: m.slug });
  for (const k of ['postcode', 'street', 'suburb', 'state', 'lat', 'lng'] as const) if (sp[k]) q.set(k, sp[k]!);
  const back = new URLSearchParams(q); back.delete('managers');
  const fee = feeLabel(m);
  const areas = await managerAreas(m.slug);
  const hasData = (m.propertyCount ?? 0) > 0;

  return (
    <main className="profile" style={{ paddingBottom: 120 }}>
      <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="av" style={{ width: 64, height: 64, fontSize: 20, ...(m.logoUrl ? { background: '#fff', border: '1px solid var(--line)' } : m.tile ? { background: m.tile.bg, color: m.tile.fg } : {}) }} aria-hidden="true">{m.logoUrl ? <img src={m.logoUrl} alt="" style={{ objectFit: 'contain' }} /> : m.initials}</div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 'clamp(28px,4.4vw,40px)', margin: 0 }}>{m.name}</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
              {m.tagline}
            </p>
            <div style={{ marginTop: 8 }}><TrustBadges m={m} full /></div>
          </div>
        </div>

        {hasData ? (
          <div className="panel stats">
            <div className="stat"><div className="n">{m.propertyCount}</div><div className="t">homes tracked</div></div>
            {m.avgRating != null && <div className="stat"><div className="n">{m.avgRating.toFixed(2)} ★</div><div className="t">average guest rating</div></div>}
            {!!m.reviewCount && <div className="stat"><div className="n">{m.reviewCount.toLocaleString('en-AU')}</div><div className="t">guest reviews</div></div>}
            {m.avgOccupancy != null && <div className="stat"><div className="n">{pct(m.avgOccupancy)}</div><div className="t">nights booked, last 12 months</div></div>}
            {m.avgNightlyRate != null && <div className="stat"><div className="n">A${Math.round(m.avgNightlyRate)}</div><div className="t">average nightly rate</div></div>}
            <div className="stat"><div className="n" style={fee ? undefined : { fontSize: 18 }}>{fee ?? 'On request'}</div><div className="t">management fee</div></div>
          </div>
        ) : (
          <div className="panel" style={{ display: 'grid', gap: 12 }}>
            <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
              <div className="stat"><div className="n" style={fee ? undefined : { fontSize: 18 }}>{fee ?? 'On request'}</div><div className="t">management fee</div></div>
              <div className="stat"><div className="n" style={{ fontSize: 18 }}>{m.cities.join(', ') || 'See below'}</div><div className="t">where they operate</div></div>
              {m.licensedAgent && <div className="stat"><div className="n" style={{ fontSize: 18 }}>Licensed agency</div><div className="t">real estate licence</div></div>}
            </div>
            <p className="hint" style={{ margin: 0 }}>No guest ratings or booking figures yet. We found {m.name} through its own website rather than in the Airbnb listing data we track, so it may list mainly on Stayz, Booking.com or its own site. Figures appear once its listings are linked, or when the manager claims this profile.</p>
          </div>
        )}

        {!m.claimed && (
          <div className="claimbox">
            <p style={{ margin: 0 }}>This profile is built from public information{hasData ? <>, including estimates from {m.name}&apos;s public listings,</> : <> on {m.name}&apos;s own website,</>} and is refreshed regularly. <Link href="/managers#why-listed">How we build profiles</Link></p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <span><b>Are you {m.name}?</b> Claim this page to add your fees, services, logo and photos, and reply to owners.</span>
              <Link className="btn secondary" href={`/claim/${m.slug}`}>Claim this page</Link>
            </div>
            <p className="hint" style={{ margin: 0 }}>Would you rather not be listed? Email <a href={`mailto:hello@cohostcompare.com?subject=${encodeURIComponent(`Remove ${m.name}`)}`}>hello@cohostcompare.com</a> from your business email and we&apos;ll remove this page.</p>
          </div>
        )}

        {(m.photos?.length ?? 0) > 0 && (
          <section aria-label={`Homes managed by ${m.name}`} style={{ display: 'grid', gap: 8 }}>
            <div className="gallery">{m.photos!.map((p) => <img key={p} src={p} alt={`A home managed by ${m.name}`} loading="lazy" />)}</div>
            <p className="hint" style={{ margin: 0 }}>Photos supplied by {m.name}.</p>
          </section>
        )}

        <section className="panel">
          <h2 style={{ fontSize: 20, marginTop: 0 }}>About</h2>
          <p style={{ margin: 0 }}>{m.about || `${m.name} manages short-term rental homes${m.cities.length ? ` in ${m.cities.join(' and ')}` : ''}.`}</p>
        </section>

        <AreaMap areas={areas} name={m.name} near={sp.lat && sp.lng && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null} />

        <section className="panel" style={{ display: 'grid', gap: 16 }}>
          {!areas.length && <div><div className="label">{hasData ? 'Where they run homes' : 'Areas they say they cover'}</div><p style={{ margin: '6px 0 0' }}>{m.suburbs.length ? m.suburbs.join(', ') : m.cities.join(', ')}{!hasData && (m.postcodes?.length ?? 0) > 0 ? <span className="hint"> · postcodes {m.postcodes!.join(', ')}</span> : null}</p></div>}
          <div><div className="label">Platforms</div><div className="chips" style={{ marginTop: 8 }}>{m.platforms.map((p) => <span className="chip" key={p}>{p}</span>)}</div>
            {!m.claimed && <p className="hint" style={{ margin: '6px 0 0' }}>{hasData ? 'Seen on their public listings. Other platforms appear once the manager claims this profile.' : 'As stated on their website.'}</p>}</div>
          {m.services.length > 0 && <div><div className="label">Services</div><div className="chips" style={{ marginTop: 8 }}>{m.services.map((s) => <span className="chip" key={s}>{s}</span>)}</div></div>}
          {m.licensedAgent && <div><div className="label">Credentials</div><p style={{ margin: '6px 0 0' }}>Licensed real estate agency</p></div>}
        </section>

        {g ? (
          <section className="panel" style={{ display: 'grid', gap: 14 }} aria-label="Full fees and contract terms">
            <h2 style={{ fontSize: 20, margin: 0 }}>Full fees and contract terms</h2>
            {near && <p style={{ margin: 0, background: 'var(--tint)', borderRadius: 10, padding: '10px 14px' }}>Near your address: <b>{near.nearby} home{near.nearby === 1 ? '' : 's'} within {COVER_KM} km</b>{near.nearbyRating ? <>, averaging <b>{near.nearbyRating.toFixed(2)} ★</b></> : null}{near.nearestKm != null ? `. The closest is about ${near.nearestKm} km away.` : '.'}</p>}
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '12px 24px', margin: 0 }}>
              <div><dt className="label">Management fee</dt><dd style={{ margin: 0 }}>{g.feeNote ?? NOT_PUBLISHED}</dd></div>
              <div><dt className="label">Setup fee</dt><dd style={{ margin: 0 }}>{g.setupNote ?? (g.setupFee == null ? NOT_PUBLISHED : g.setupFee === 0 ? 'None' : `A$${g.setupFee}`)}</dd></div>
              <div><dt className="label">Minimum term</dt><dd style={{ margin: 0 }}>{g.minTermMonths == null ? NOT_PUBLISHED : g.minTermMonths === 0 ? 'No lock-in' : `${g.minTermMonths} months`}</dd></div>
              <div><dt className="label">Notice to leave</dt><dd style={{ margin: 0 }}>{g.noticeDays == null ? NOT_PUBLISHED : `${g.noticeDays} days`}</dd></div>
              <div><dt className="label">Cleaning and linen</dt><dd style={{ margin: 0 }}>{g.cleaningPassedOn == null ? NOT_PUBLISHED : `${g.cleaningPassedOn ? 'Charged to guests' : 'Charged to you'}${g.linenIncluded ? ', linen included' : ''}`}</dd></div>
              <div><dt className="label">Using it yourself</dt><dd style={{ margin: 0 }}>{g.ownerStaysAllowed ?? NOT_PUBLISHED}</dd></div>
            </dl>
            {g.inclusions.length > 0 && <div><div className="label">Included</div><div className="chips" style={{ marginTop: 8 }}>{g.inclusions.map((x) => <span className="chip" key={x}>{x}</span>)}</div></div>}
          </section>
        ) : (
          <section className="locked" aria-label="Details for signed-in owners">
            <h2 style={{ fontSize: 20, margin: 0 }}>Full fees, terms and performance near you</h2>
            <ul>
              <li>How many homes they run near your address, and how those are rated</li>
              <li>Setup fee, minimum term and notice period, where published</li>
              <li>Rules on using the property yourself</li>
            </ul>
            <Link className="btn secondary" href={`/signin?next=${encodeURIComponent(`/managers/${m.slug}?${back.toString()}`)}`}>Sign in free to see these</Link>
          </section>
        )}
        {hasData && <p className="hint" style={{ margin: 0 }}>Performance figures are estimates based on {m.name}&apos;s public Airbnb listings over the last 12 months{m.dataAsOf ? `, updated ${new Date(m.dataAsOf).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}` : ''}. Data source: AirROI (<a href="https://www.airroi.com">www.airroi.com</a>).</p>}
      </div>

      <aside className="sticky">
        <ProfileQuote slug={m.slug} name={m.name} query={back.toString()} />
      </aside>
    </main>
  );
}
