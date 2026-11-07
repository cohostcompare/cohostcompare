import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DataSource from '@/components/DataSource';
import JsonLd from '@/components/JsonLd';
import { fmtDate } from '@/lib/market';
import { MIN_HOMES_HERE, MIN_REVIEWS, RANK_CITIES, TOP_N, ranking } from '@/lib/rankings';
import { article, breadcrumbs, faqPage, itemList, metaDescription } from '@/lib/seo';

export const revalidate = 21600; // figures are cached 6 hours
// Built on first visit, not at build time: each list reads every area in the city, which is heavy alongside the rest of the build.
export function generateStaticParams() { return [] as { slug: string }[]; }

type P = { params: Promise<{ slug: string }> };
const year = () => new Date().getFullYear();
const titleFor = (label: string) => `Best Airbnb managers in ${label[0].toUpperCase()}${label.slice(1)} (${year()})`;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const c = RANK_CITIES.find((x) => x.slug === slug);
  if (!c) return {};
  const title = titleFor(c.short);
  return {
    title,
    description: metaDescription(`The top Airbnb and short-term rental management companies in ${c.label}, ranked on guest ratings, local homes and responsiveness, with published fees and nightly rates. No paid placements. Updated automatically.`),
    alternates: { canonical: `/best-airbnb-managers/${c.slug}` },
  };
}

const fee = (a: number | null, b: number | null) => (a == null ? 'On request' : a === b || b == null ? `${a}%` : `${a}–${b}%`);

export default async function BestIn({ params }: P) {
  const { slug } = await params;
  if (!RANK_CITIES.some((c) => c.slug === slug)) notFound();
  const r = await ranking(slug); // a failed read throws, so an error is never cached as an empty or missing page
  if (!r) notFound();
  const { city } = r;
  const date = fmtDate(r.asOf);
  const Label = `${city.label[0].toUpperCase()}${city.label.slice(1)}`;
  const top3 = r.list.slice(0, 3).map((m) => m.name);
  const answer = r.list.length
    ? `As of ${date}, the top-ranked Airbnb managers in ${city.label} are ${top3.slice(0, -1).join(', ')}${top3.length > 1 ? ' and ' : ''}${top3[top3.length - 1]}, on a blend of public guest ratings, homes they run in the area and whether they reply to owners on CoHostCompare.`
    : `We don't have enough rated managers in ${city.label} to rank yet.`;
  const faqs: [string, string][] = [
    [`Who are the best Airbnb managers in ${city.label}?`, answer],
    [`How is this list ranked?`, `On a blend: guest rating from public reviews, adjusted for how many reviews it rests on (50%); homes they run near one area here (30%); being on CoHostCompare to reply to owners, which is free (10%); and owner reviews on CoHostCompare (10%). A manager needs at least ${MIN_REVIEWS} reviews and ${MIN_HOMES_HERE} homes near one area here. Hotels, resorts and serviced-apartment operators aren't ranked. No manager can pay to appear or move up, and we don't edit the order by hand.`],
    [`How many Airbnb managers operate in ${city.label}?`, `${r.covering} managers run at least one short-term rental within 4 km of the ${r.areas.length} areas we cover in ${city.label}. ${r.eligible} have enough guest reviews to be ranked.`],
    [`Is the best-rated manager the right one for me?`, `Not always. Guest ratings show how guests feel about the stays. Fees, contract terms, owner communication and how many homes they run near your street matter too. Search your address to see who covers it, then request quotes from up to five in one standard format.`],
  ];
  return (
    <main style={{ maxWidth: 1040, paddingBlock: '16px 64px', display: 'grid', gap: 22 }}>
      <JsonLd data={[
        breadcrumbs([['Home', '/'], ['Best Airbnb managers', '/best-airbnb-managers'], [Label, `/best-airbnb-managers/${city.slug}`]]),
        article({ title: titleFor(city.label), description: answer, path: `/best-airbnb-managers/${city.slug}`, published: '2026-11-07', modified: r.asOf }),
        itemList(`Top-rated Airbnb managers in ${city.label}`, r.list.map((m) => ({ name: m.name, path: `/managers/${m.slug}` }))),
        faqPage(faqs),
      ]} />
      <header style={{ display: 'grid', gap: 8 }}>
        <Link href="/best-airbnb-managers" className="hint">← All rankings</Link>
        <span className="label" style={{ color: 'var(--brand)' }}>Updated {date} · no paid placements</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', margin: 0 }}>Best Airbnb managers in {city.label}</h1>
        <p className="lede" style={{ margin: 0 }}>{answer}</p>
      </header>

      {r.list.length > 0 && (
        <section style={{ display: 'grid', gap: 10 }} aria-labelledby="top">
          <h2 id="top" style={{ fontSize: 22, margin: 0 }}>Top {Math.min(TOP_N, r.list.length)} Airbnb managers in {city.label}</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label={`Top-rated managers in ${city.label}`}>
            <table className="data-table">
              <thead><tr><th scope="col">#</th><th scope="col">Manager</th><th scope="col">Guest rating</th><th scope="col">Reviews</th><th scope="col">Most homes near one {city.label.includes('holiday') ? 'area' : 'suburb'}</th><th scope="col">Homes in total</th><th scope="col">Published fee</th><th scope="col">Typical nightly rate</th></tr></thead>
              <tbody>{r.list.map((m, i) => (
                <tr key={m.slug}>
                  <td>{i + 1}</td>
                  <th scope="row"><Link href={`/managers/${m.slug}`}>{m.name}</Link>{m.claimed && <span className="hint"> · on CoHostCompare</span>}<div className="hint" style={{ fontWeight: 400 }}>{m.areasHere.slice(0, 3).join(', ')}{m.areasHere.length > 3 ? ` +${m.areasHere.length - 3} more` : ''}</div></th>
                  <td>{m.rating.toFixed(2)} ★</td>
                  <td>{m.reviews.toLocaleString('en-AU')}</td>
                  <td>{m.homesHere}</td>
                  <td>{m.totalHomes ?? '–'}</td>
                  <td>{fee(m.feeMin, m.feeMax)}</td>
                  <td>{m.nightly ? `A$${m.nightly}` : '–'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p className="hint" style={{ margin: 0 }}>Ratings and home counts are across each manager&apos;s public listings over the last 12 months. Fees are as published by the manager; unclaimed profiles haven&apos;t been confirmed by them. &ldquo;On CoHostCompare&rdquo; means the manager has claimed their profile and replies to quote requests here; it doesn&apos;t change the order.</p>
        </section>
      )}

      <section className="panel" style={{ display: 'grid', gap: 10, background: 'var(--tint)' }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>See who covers your street</h2>
        <p style={{ margin: 0 }}>A city-wide list can&apos;t tell you who runs homes near your property. Search your address to see every manager within 4 km, sorted the way you choose, then request quotes from up to five in one standard format. Free, no sales calls.</p>
        <div><Link className="btn primary" href="/">Search your address</Link></div>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Areas in {city.label}</h2>
        <p style={{ margin: 0 }}>{r.areas.map((a, i) => <span key={a.slug}>{i ? ' · ' : ''}<Link href={`/areas/${a.slug}`}>{a.label}</Link></span>)}</p>
      </section>

      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>How this list is made</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
          <li>Included: every published manager running at least one short-term rental within 4 km of an area we cover in {city.label} ({r.covering} managers), with at least {MIN_HOMES_HERE} homes near one of those areas and at least {MIN_REVIEWS} public guest reviews ({r.eligible} managers).</li>
          <li>Order: a blend of guest rating (50%, each rating pulled toward the {city.label} average{r.meanRating ? ` of ${r.meanRating.toFixed(2)} ★` : ''} as if it had 50 more average reviews, so a handful of perfect scores can&apos;t beat thousands of near-perfect ones), homes they run near one area here (30%, on a log scale), being on CoHostCompare to reply to owners (10%, free to every manager) and owner reviews here (10%). Ties go to the manager with more homes nearby.</li>
          <li>Left out: hotels, resorts, motels and serviced-apartment operators, which take bookings rather than manage homes for owners. Their profiles stay on the site.</li>
          <li>Nothing a manager pays for is used, and we never reorder by hand. A manager can&apos;t ask to be moved up or removed for a better spot.</li>
          <li>The list rebuilds automatically from the latest data. Last worked out on {date}. <Link href="/facts">More market figures</Link>.</li>
        </ul>
        <DataSource />
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Questions</h2>
        {faqs.map(([q, a]) => <div key={q}><h3 style={{ fontSize: 17, margin: '0 0 4px' }}>{q}</h3><p style={{ margin: 0 }}>{a}</p></div>)}
      </section>
    </main>
  );
}
