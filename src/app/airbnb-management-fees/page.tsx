import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { feeRange, fmtDate, market, median, MIN_FOR_TYPICAL } from '@/lib/market';
import { article, breadcrumbs, faqPage, SITE } from '@/lib/seo';
import { adminClient } from '@/lib/supabase/server';

/*
 "Airbnb management fees in Australia" report, from fees managers publish (their website or their profile).
 Published fees only: no revenue or occupancy (those are a paid perk), no AirROI figures, so no data-source line is needed.
*/
export const revalidate = 21600;
const year = () => new Date().getFullYear();

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Airbnb management fees in Australia (${year()} report)`,
    description: 'What Australian Airbnb and short-term rental managers charge, from the fees they publish: the typical fee, the full range, how fees spread, by city, and what to check is included.',
    alternates: { canonical: '/airbnb-management-fees' },
  };
}

const BANDS: [string, number, number][] = [['Under 15%', 0, 15], ['15% to 19.9%', 15, 20], ['20% to 24.9%', 20, 25], ['25% and over', 25, 101]];

export default async function FeesReport() {
  const m = await market();
  const { data, error } = await adminClient().from('managers').select('fee_min, fee_max, claimed').eq('published', true).not('fee_min', 'is', null);
  if (error && process.env.VERCEL) throw new Error(`fees: ${error.message}`); // never cache an empty report
  const rows = (data || []) as { fee_min: number; fee_max: number | null; claimed: boolean }[];
  const mids = rows.map((r) => (Number(r.fee_min) + Number(r.fee_max ?? r.fee_min)) / 2);
  const bands = BANDS.map(([label, lo, hi]) => ({ label, n: mids.filter((x) => x >= lo && x < hi).length }));
  const flat = rows.filter((r) => r.fee_max == null || Number(r.fee_max) === Number(r.fee_min)).length;
  const typical = mids.length >= MIN_FOR_TYPICAL ? Math.round(median(mids)! * 10) / 10 : null;
  const date = fmtDate(m.asOf);
  const range = feeRange(m.fee);
  const answer = typical != null
    ? `As of ${date}, the typical published Airbnb management fee in Australia is ${typical}% of booking income, across ${rows.length} managers on CoHostCompare that publish a fee. Published fees range from ${range}.`
    : `Published Airbnb management fees in Australia range from ${range || 'about 15% to 30%'} of booking income, from the managers on CoHostCompare that publish a fee.`;
  const faqs: [string, string][] = [
    ['How much do Airbnb managers charge in Australia?', answer],
    ['Is the fee charged on the nightly rate or total booking income?', 'Most managers charge a percentage of booking income. Check whether that is before or after platform fees and cleaning fees, as it changes what you pay on the same bookings.'],
    ['Do management fees include GST?', 'Not always. Some published fees include GST and some add 10% on top. CoHostCompare quotes show GST the same way for every manager so you can compare like for like.'],
    ['What usually costs extra?', 'Setup fees (photos, listing, furnishing advice), cleaning and linen (often charged to guests but sometimes to owners), maintenance call-outs, and supplies. Ask each manager what is included before you compare percentages.'],
    ['Is a co-host cheaper than a full-service manager?', 'Usually, because a co-host often handles only parts of the job, such as listing, pricing and guest messages. See our guide on co-hosts versus full-service managers.'],
  ];
  return (
    <main style={{ maxWidth: 900, paddingBlock: '16px 64px', display: 'grid', gap: 22 }}>
      <JsonLd data={[
        breadcrumbs([['Home', '/'], ['Airbnb management fees', '/airbnb-management-fees']]),
        article({ title: `Airbnb management fees in Australia (${year()} report)`, description: answer, path: '/airbnb-management-fees', published: '2026-11-07', modified: m.asOf }),
        faqPage(faqs),
        { '@context': 'https://schema.org', '@type': 'Dataset', name: 'Published Airbnb management fees in Australia', description: 'Management fees published by Australian short-term rental managers, summarised by band and city.', url: `${SITE}/airbnb-management-fees`, dateModified: m.asOf, inLanguage: 'en-AU', isAccessibleForFree: true, creator: { '@type': 'Organization', name: 'CoHostCompare', url: SITE } },
      ]} />
      <header style={{ display: 'grid', gap: 8 }}>
        <span className="label" style={{ color: 'var(--brand)' }}>Fee report · updated {date}</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', margin: 0 }}>Airbnb management fees in Australia</h1>
        <p className="lede" style={{ margin: 0 }}>{answer}</p>
      </header>

      <section className="dash-stats" aria-label="Headline figures">
        <div className="panel"><b>{typical != null ? `${typical}%` : 'n/a'}</b><span>typical published fee</span></div>
        <div className="panel"><b>{range || 'n/a'}</b><span>range of published fees</span></div>
        <div className="panel"><b>{rows.length}</b><span>managers that publish a fee</span></div>
        <div className="panel"><b>{m.managers - rows.length}</b><span>quote on request only</span></div>
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>How published fees spread</h2>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Fees by band">
          <table className="data-table">
            <thead><tr><th scope="col">Fee (mid-point of each manager&apos;s range)</th><th scope="col">Managers</th><th scope="col">Share</th></tr></thead>
            <tbody>{bands.map((b) => <tr key={b.label}><th scope="row">{b.label}</th><td>{b.n}</td><td>{mids.length ? `${Math.round((b.n / mids.length) * 100)}%` : '–'}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="hint" style={{ margin: 0 }}>{flat} of {rows.length} publish a single fee; the rest give a range that usually depends on the service level or property.</p>
      </section>

      {m.cities.length > 0 && (
        <section style={{ display: 'grid', gap: 10 }}>
          <h2 style={{ fontSize: 22, margin: 0 }}>By city or region</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Fees by city">
            <table className="data-table">
              <thead><tr><th scope="col">City or region</th><th scope="col">Managers</th><th scope="col">Publish a fee</th><th scope="col">Published fees</th><th scope="col">Typical fee</th></tr></thead>
              <tbody>{m.cities.map((c) => <tr key={c.city}><th scope="row">{c.city}</th><td>{c.managers}</td><td>{c.fee.count}</td><td>{feeRange(c.fee) || 'On request'}</td><td>{c.fee.mid != null ? `${c.fee.mid}%` : '–'}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="hint" style={{ margin: 0 }}>A typical fee is only shown where at least {MIN_FOR_TYPICAL} managers publish one. For a single area, see <Link href="/areas">managers by area</Link>.</p>
        </section>
      )}

      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Compare fees on the same bookings</h2>
        <p style={{ margin: 0 }}>A lower percentage isn&apos;t always cheaper. GST, setup fees, cleaning and linen, and whether the fee is taken before or after platform fees can each swing the yearly cost by thousands. Quotes on CoHostCompare use one standard format and are compared on the same booking income, so you see the real difference.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Link className="btn primary" href="/">Compare managers for your address</Link><Link className="btn secondary" href="/guides/co-host-vs-full-service-manager">Co-host or full-service manager?</Link></div>
      </section>

      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>How this report is made</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
          <li>Fees come only from managers who publish one, on their own website or their CoHostCompare profile. Fees on unclaimed profiles haven&apos;t been confirmed by the manager.</li>
          <li>Each manager counts once, at the mid-point of their published range. The typical fee is the median of those mid-points.</li>
          <li>Managers that only quote on request aren&apos;t included in the fee figures. No manager pays to be included or excluded.</li>
          <li>The report updates automatically. Last worked out on {date}. Journalists and researchers are welcome to quote it with a link. More figures: <Link href="/facts">market facts</Link>.</li>
        </ul>
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Questions</h2>
        {faqs.map(([q, a]) => <div key={q}><h3 style={{ fontSize: 17, margin: '0 0 4px' }}>{q}</h3><p style={{ margin: 0 }}>{a}</p></div>)}
      </section>
    </main>
  );
}
