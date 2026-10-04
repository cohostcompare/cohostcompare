import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DataSource from '@/components/DataSource';
import JsonLd from '@/components/JsonLd';
import { feeRange, feeStats } from '@/lib/market';
import { breadcrumbs, faqPage, itemList } from '@/lib/seo';
import ResultsList from '@/components/ResultsList';
import { area, areas } from '@/lib/areas';
import { COVER_KM, managersNear } from '@/lib/data';
import { RULES } from '@/lib/rules';

export const revalidate = 1800; // cached half an hour; figures move slowly
type P = Promise<{ slug: string }>;

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); if (!s.length) return null; const i = Math.floor(s.length / 2); return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2; };
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (d: number) => (d * Math.PI) / 180;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2));
};
const stateOf = (city: string) => (/melbourne|victoria/i.test(city) ? 'vic' : 'nsw');

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const a = await area((await params).slug);
  if (!a) return {};
  return {
    title: `Airbnb and short-term rental managers in ${a.label}`,
    description: `Compare short-term rental managers running homes in ${a.label}: fees, guest ratings and homes managed nearby, side by side, plus the local short-stay rules. Request up to five quotes free.`,
    alternates: { canonical: `/areas/${(await params).slug}` },
  };
}

export default async function AreaPage({ params }: { params: P }) {
  const a = await area((await params).slug);
  if (!a) notFound();
  const [near, all, { withReach }, { withRequirements }, { withReviewSummaries }] = await Promise.all([managersNear(a.lat, a.lng), areas(), import('@/lib/reach'), import('@/lib/requirementsServer'), import('@/lib/reviews')]);
  const managers = await withReach(await withRequirements(await withReviewSummaries(near)));
  const q = new URLSearchParams({ lat: String(a.lat), lng: String(a.lng), suburb: a.label });

  // Area snapshot from the same figures shown on each card.
  const homes = managers.reduce((s, m) => s + (m.nearby || 0), 0);
  const fees = managers.filter((m) => m.feeMin != null).map((m) => (Number(m.feeMin) + Number(m.feeMax ?? m.feeMin)) / 2);
  const feeMid = median(fees);
  const rated = managers.filter((m) => m.nearbyRating && m.nearby);
  const rating = rated.length ? rated.reduce((s, m) => s + Number(m.nearbyRating) * m.nearby, 0) / rated.reduce((s, m) => s + m.nearby, 0) : null;
  const nightly = median(managers.map((m) => Number(m.avgNightlyRate)).filter((x) => x > 0));
  const withAirbnb = managers.filter((m) => m.propertyCount).length;
  const rules = RULES.find((r) => r.code === stateOf(a.city));
  const fee = feeStats(managers);
  const range = feeRange(fee);
  const top = [...managers].sort((x, y) => (y.nearby || 0) - (x.nearby || 0)).slice(0, 3).map((m) => m.name);
  const faqs: [string, string][] = [
    [`How many short-term rental managers cover ${a.label}?`, managers.length ? `${managers.length} manager${managers.length === 1 ? '' : 's'} run${managers.length === 1 ? 's' : ''} homes within ${COVER_KM} km of central ${a.label}${homes ? `, with ${homes.toLocaleString('en-AU')} Airbnb homes between them nearby` : ''}.` : `We haven't mapped managers in ${a.label} yet. Search your address to see who covers it.`],
    [`How much do Airbnb managers charge in ${a.label}?`, fee.count ? `Of the managers here who publish a fee, fees range from ${range}, with a typical fee of ${fee.mid}% of booking income. Check whether GST, setup fees, cleaning and linen are extra.` : `Most managers here quote fees on request. Request quotes from up to five and compare them in one format.`],
    [`What are the short-stay rules in ${a.label}?`, rules ? `${rules.summary} Check with your council and strata or owners corporation too.` : 'Check with your council and strata or owners corporation before you list.'],
    [`Can managers pay to rank higher here?`, 'No. No manager can pay for placement, ranking or ratings. You choose how results are sorted.'],
  ];
  const nearbyAreas = all.filter((x) => x.slug !== a.slug && x.city === a.city).map((x) => ({ ...x, d: km(a, x) })).sort((x, y) => x.d - y.d).slice(0, 6);

  return (
    <main>
      <JsonLd data={[
        breadcrumbs([['Home', '/'], ['Areas', '/areas'], [a.label, `/areas/${a.slug}`]]),
        faqPage(faqs),
        itemList(`Short-term rental managers in ${a.label}`, managers.slice(0, 30).map((m) => ({ name: m.name, path: `/managers/${m.slug}` }))),
      ]} />
      <div className="results-head">
        <div>
          <Link href="/areas" className="hint">← All areas</Link>
          <h1>Short-term rental managers in {a.label}</h1>
          <span className="hint">{managers.length} manager{managers.length === 1 ? '' : 's'} running homes within {COVER_KM} km of central {a.label}. Sort them however you like. No manager can pay for a higher place. For results around your exact address, <Link href="/">search your address</Link>.</span>
        </div>
      </div>

      {managers.length > 0 && (
        <section className="dash-stats" aria-label={`${a.label} at a glance`} style={{ marginBottom: 18 }}>
          <div className="panel"><b>{managers.length}</b><span>managers covering {a.label}</span></div>
          {homes > 0 && <div className="panel"><b>{homes.toLocaleString('en-AU')}</b><span>Airbnb homes they run nearby</span></div>}
          <div className="panel"><b>{feeMid != null ? `${Math.round(feeMid * 10) / 10}%` : 'On request'}</b><span>{feeMid != null ? `typical management fee${range && fee.low !== fee.high ? ` (range ${range}, ${fees.length} publish fees)` : ` (${fees.length} publish fees)`}` : 'most managers quote fees on request'}</span></div>
          {rating != null && <div className="panel"><b>{rating.toFixed(2)} ★</b><span>average guest rating nearby</span></div>}
          {nightly != null && <div className="panel"><b>A${Math.round(nightly)}</b><span>typical nightly rate</span></div>}
        </section>
      )}

      {managers.length ? <ResultsList managers={managers} query={q.toString()} /> : <p className="panel">We haven&apos;t mapped managers here yet. <Link href="/">Search your address</Link>.</p>}

      {managers.length > 0 && (
        <section className="prose" style={{ marginTop: 28, maxWidth: 760 }}>
          <h2>Choosing a manager in {a.label}</h2>
          <p>{managers.length} short-term rental manager{managers.length === 1 ? ' runs' : 's run'} homes within {COVER_KM} km of central {a.label}{top.length > 1 ? `, led by ${top.slice(0, -1).join(', ')} and ${top[top.length - 1]} on homes nearby` : ''}. {fee.count ? `Published fees here range from ${range}, with a typical fee of ${fee.mid}%.` : 'Most quote fees on request.'}{nightly != null ? ` The typical nightly rate across their homes nearby is about A$${Math.round(nightly)}.` : ''} Compare guest ratings near you, what&apos;s included in the fee, setup costs and the minimum term, then request quotes from up to five in one go.</p>
          <p>New to this? Read <Link href="/guides/how-to-choose-an-airbnb-manager">how to choose a manager</Link> and <Link href="/guides/co-host-vs-full-service-manager">co-host or full-service</Link>{rules ? <>, and the <Link href={`/rules/${rules.code}`}>{rules.name} short-stay rules</Link></> : null}.</p>
        </section>
      )}

      <section className="facts-grid" style={{ marginBlock: '28px 18px' }}>
        {rules && (
          <div className="panel" style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
            <h2 style={{ fontSize: 20, margin: 0 }}>Short-stay rules in {rules.name}</h2>
            <p style={{ margin: 0 }}>{rules.summary}</p>
            <p style={{ margin: 0, display: 'flex', gap: 14, flexWrap: 'wrap' }}><Link href={`/rules/${rules.code}`}>{rules.name} rules →</Link><Link href={`/rules?q=${encodeURIComponent(`What are the short-stay rules in ${a.label}?`)}`}>Ask about {a.label} →</Link></p>
          </div>
        )}
        <div className="panel" style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>What could a home in {a.label} earn?</h2>
          <p style={{ margin: 0 }}>Get a free estimate of yearly booking income for your address and number of bedrooms, from area averages over the last 12 months.</p>
          <p style={{ margin: 0 }}><Link href="/earnings">Estimate my earnings →</Link></p>
        </div>
      </section>

      <section className="panel" style={{ display: 'grid', gap: 10, marginBottom: 18, maxWidth: 760 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Common questions about {a.label}</h2>
        {faqs.map(([q, ans]) => <details key={q} className="faq"><summary>{q}</summary><p>{ans}</p></details>)}
      </section>

      {nearbyAreas.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>Nearby areas</h2>
          <div className="chips">{nearbyAreas.map((x) => <Link key={x.slug} className="chip" href={`/areas/${x.slug}`}>{x.label}</Link>)}</div>
        </section>
      )}

      <div style={{ margin: '0 0 24px', display: 'grid', gap: 6 }}>
        <p className="hint" style={{ margin: 0 }}>Ratings, home counts and nightly rates are estimates based on managers&apos; public listings over the last 12 months. Figures are estimates. Fees are a percentage of booking income, shown only where a manager publishes them. Fees on unclaimed profiles come from the manager&apos;s own website, haven&apos;t been confirmed by them, and may or may not include GST.{withAirbnb < managers.length ? ' Some managers cover this area according to their own website, without listing figures.' : ''}</p>
        <DataSource />
      </div>
    </main>
  );
}
