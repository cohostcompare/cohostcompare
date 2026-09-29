import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allManagerSlugs, feeBand, publicManager } from '@/lib/data';

type P = Promise<{ slug: string }>;
type SP = Promise<{ postcode?: string; address?: string }>;

export async function generateStaticParams() {
  return (await allManagerSlugs()).map((slug) => ({ slug }));
}

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
  const q = new URLSearchParams({ managers: m.slug });
  if (sp.postcode) q.set('postcode', sp.postcode);
  if (sp.address) q.set('address', sp.address);

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

        <section className="locked" aria-label="Details for signed-in owners">
          <h2 style={{ fontSize: 20, margin: 0 }}>Full fees and contract terms</h2>
          <ul>
            <li>Setup fee, and whether cleaning and linen are charged on top</li>
            <li>Minimum term, notice period and rules on using the property yourself</li>
            <li>How many properties they manage near your address, and how those are rated</li>
          </ul>
          <Link className="btn secondary" href={`/quote?${q.toString()}`}>Create a free account to see these</Link>
        </section>
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
