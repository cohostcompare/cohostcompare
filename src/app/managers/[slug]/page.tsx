import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { feeBand, gatedDetails, publicManager } from '@/lib/data';
import { currentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type P = Promise<{ slug: string }>;
type SP = Promise<{ postcode?: string; street?: string; suburb?: string; state?: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const m = await publicManager((await params).slug);
  if (!m) return {};
  return {
    title: `${m.name}: short-term rental manager in ${m.cities.join(' and ')}`,
    description: `${m.name} manages ${m.propertyCount ?? 'multiple'} properties across ${m.suburbs.slice(0, 4).join(', ')}. Fees ${feeBand(m)}, rated ${m.avgRating?.toFixed(2) ?? 'n/a'} by guests. Compare and request a quote.`,
    robots: m.demo ? { index: false } : undefined,
  };
}

export default async function ManagerPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const m = await publicManager((await params).slug);
  if (!m) notFound();
  const sp = await searchParams;
  const user = await currentUser();
  const g = user ? await gatedDetails(m.slug) : null;
  const q = new URLSearchParams({ managers: m.slug });
  if (sp.postcode) q.set('postcode', sp.postcode);
  for (const k of ['street', 'suburb', 'state'] as const) if (sp[k]) q.set(k, sp[k]!);

  return (
    <main className="profile">
      <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="av" style={{ width: 64, height: 64, fontSize: 20 }} aria-hidden="true">{m.initials}</div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 'clamp(28px,4.4vw,40px)', margin: 0 }}>{m.name}</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
              {m.tagline} {m.demo && <span className="demo-flag">Demo profile</span>} {!m.claimed && <span className="chip">Not yet claimed</span>}
            </p>
          </div>
        </div>

        <div className="panel stats">
          <div className="stat"><div className="n">{m.propertyCount ?? '—'}</div><div className="t">properties managed</div></div>
          <div className="stat"><div className="n">{m.avgRating != null ? `${m.avgRating.toFixed(2)} ★` : '—'}</div><div className="t">average guest rating</div></div>
          <div className="stat"><div className="n">{m.reviewCount?.toLocaleString('en-AU') ?? '—'}</div><div className="t">guest reviews</div></div>
          <div className="stat"><div className="n">{feeBand(m)}</div><div className="t">management fee</div></div>
          {m.responseHours != null && <div className="stat"><div className="n">~{m.responseHours}h</div><div className="t">typical reply time</div></div>}
        </div>

        <section className="panel">
          <h2 style={{ fontSize: 20, marginTop: 0 }}>About</h2>
          <p style={{ margin: 0 }}>{m.about}</p>
        </section>

        <section className="panel" style={{ display: 'grid', gap: 16 }}>
          <div><div className="label">Areas covered</div><p style={{ margin: '6px 0 0' }}>{m.suburbs.join(', ')}</p></div>
          <div><div className="label">Lists your property on</div><div className="chips" style={{ marginTop: 8 }}>{m.platforms.map((p) => <span className="chip" key={p}>{p}</span>)}</div></div>
          <div><div className="label">Services</div><div className="chips" style={{ marginTop: 8 }}>{m.services.map((s) => <span className="chip" key={s}>{s}</span>)}</div></div>
          <div><div className="label">Credentials</div><p style={{ margin: '6px 0 0' }}>{m.licensedAgent ? 'Licensed real estate agency' : 'Co-host (not a licensed agency)'}</p></div>
        </section>

        {g ? (
          <section className="panel" style={{ display: 'grid', gap: 14 }} aria-label="Full fees and contract terms">
            <h2 style={{ fontSize: 20, margin: 0 }}>Full fees and contract terms</h2>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '12px 24px', margin: 0 }}>
              <div><dt className="label">Management fee</dt><dd style={{ margin: 0 }}>{feeBand(m)} of booking revenue</dd></div>
              <div><dt className="label">Setup fee</dt><dd style={{ margin: 0 }}>{g.setupFee == null ? 'Ask' : g.setupFee === 0 ? 'None' : `A$${g.setupFee}`}</dd></div>
              <div><dt className="label">Cleaning</dt><dd style={{ margin: 0 }}>{g.cleaningPassedOn ? 'Charged to guests' : 'Charged to you'}{g.linenIncluded ? ', linen included' : ', linen extra'}</dd></div>
              <div><dt className="label">Minimum term</dt><dd style={{ margin: 0 }}>{g.minTermMonths ? `${g.minTermMonths} months` : 'None'}</dd></div>
              <div><dt className="label">Notice to leave</dt><dd style={{ margin: 0 }}>{g.noticeDays ? `${g.noticeDays} days` : 'Ask'}</dd></div>
              <div><dt className="label">Using it yourself</dt><dd style={{ margin: 0 }}>{g.ownerStaysAllowed}</dd></div>
            </dl>
            {g.inclusions.length > 0 && <div><div className="label">Included</div><div className="chips" style={{ marginTop: 8 }}>{g.inclusions.map((x) => <span className="chip" key={x}>{x}</span>)}</div></div>}
            {g.nearbyStats && <p style={{ margin: 0 }}>Manages <b>{g.nearbyStats.properties} properties within {g.nearbyStats.withinKm} km</b> of this area{g.nearbyStats.avgRating ? <>, averaging <b>{g.nearbyStats.avgRating} ★</b></> : null}.</p>}
          </section>
        ) : (
          <section className="locked" aria-label="Details for signed-in owners">
            <h2 style={{ fontSize: 20, margin: 0 }}>Full fees and contract terms</h2>
            <ul>
              <li>Setup fee, and whether cleaning and linen are charged on top</li>
              <li>Minimum term, notice period and rules on using the property yourself</li>
              <li>How many properties they manage near your address, and how those are rated</li>
            </ul>
            <Link className="btn secondary" href={`/signin?next=${encodeURIComponent(`/managers/${m.slug}`)}`}>Sign in free to see these</Link>
          </section>
        )}
      </div>

      <aside className="sticky">
        <div className="panel" style={{ display: 'grid', gap: 12 }}>
          <div className="label">Interested?</div>
          <p style={{ margin: 0 }}>Describe your property once and get a quote in a standard format you can compare with other managers.</p>
          <Link className="btn primary" href={`/quote?${q.toString()}`}>Request a quote</Link>
          <p className="hint" style={{ margin: 0 }}>Contact details are shared once {m.name} accepts your request.</p>
        </div>
        <Link href={sp.postcode ? `/search?postcode=${sp.postcode}` : '/'} className="hint">← Back to managers near you</Link>
      </aside>
    </main>
  );
}
