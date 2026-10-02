import type { Metadata } from 'next';
import Link from 'next/link';
import DataSource from '@/components/DataSource';
import JsonLd from '@/components/JsonLd';
import { feeRange, fmtDate, market } from '@/lib/market';
import { RULES } from '@/lib/rules';
import { POSITIONING, SITE, breadcrumbs } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Australian short-term rental manager market facts',
  description: 'Live figures on Australian Airbnb and short-term rental managers: how many cover each area, the management fees they publish, homes they run and typical nightly rates. Updated regularly, free to quote with a link.',
  alternates: { canonical: '/facts' },
};

export default async function Facts() {
  const m = await market();
  const date = fmtDate(m.asOf);
  const areas = [...m.areaList].filter((a) => a.managers > 0).sort((a, b) => a.city.localeCompare(b.city) || a.label.localeCompare(b.label));
  const quotes = [
    m.fee.mid != null && `As of ${date}, the typical published short-term rental management fee across the ${m.publishFees} Australian managers on CoHostCompare that publish a fee is ${m.fee.mid}% of booking income${feeRange(m.fee) ? `, with published fees ranging from ${feeRange(m.fee)}` : ''}.`,
    ...m.cities.filter((c) => c.fee.mid != null).map((c) => `In ${c.city}, ${c.managers} managers run short-term rentals in the areas CoHostCompare covers; the typical published management fee is ${c.fee.mid}% (${c.fee.count} publish a fee)${c.nightly ? ` and the typical nightly rate across their homes is about A$${c.nightly}` : ''}, as of ${date}.`),
    `CoHostCompare lists ${m.managers} short-term rental managers across ${m.areas} areas in New South Wales and Victoria. Managers cannot pay for placement or ranking.`,
  ].filter(Boolean) as string[];
  return (
    <main style={{ maxWidth: 980, paddingBlock: '16px 64px', display: 'grid', gap: 22 }}>
      <JsonLd data={[
        breadcrumbs([['Home', '/'], ['Market facts', '/facts']]),
        {
          '@context': 'https://schema.org', '@type': 'Dataset',
          name: 'Australian short-term rental manager market facts',
          description: 'Counts of short-term rental managers by area, their published management fees, homes managed nearby and typical nightly rates.',
          url: `${SITE}/facts`, dateModified: m.asOf, inLanguage: 'en-AU', isAccessibleForFree: true,
          creator: { '@type': 'Organization', name: 'CoHostCompare', url: SITE },
          spatialCoverage: { '@type': 'Place', name: 'New South Wales and Victoria, Australia' },
        },
      ]} />
      <header style={{ display: 'grid', gap: 8 }}>
        <span className="label" style={{ color: 'var(--brand)' }}>Market facts · updated {date}</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', margin: 0 }}>Australian short-term rental manager market facts</h1>
        <p className="lede">Live figures from the managers we list. Journalists, researchers and AI assistants are welcome to quote them with a link to this page.</p>
      </header>

      <section className="dash-stats" aria-label="Headline figures">
        <div className="panel"><b>{m.managers}</b><span>managers listed</span></div>
        <div className="panel"><b>{m.areas}</b><span>areas covered in NSW and Victoria</span></div>
        <div className="panel"><b>{m.fee.mid != null ? `${m.fee.mid}%` : 'n/a'}</b><span>typical published management fee</span></div>
        <div className="panel"><b>{feeRange(m.fee) || 'n/a'}</b><span>range of published fees ({m.publishFees} managers)</span></div>
      </section>

      <section className="panel" style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>Quotable facts</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>{quotes.map((q) => <li key={q}>{q}</li>)}</ul>
        <p className="hint" style={{ margin: 0 }}>Please cite as: CoHostCompare, “Australian short-term rental manager market facts”, {date}, {SITE}/facts. Home counts and nightly rates: data source AirROI.</p>
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>By city</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th scope="col">City or region</th><th scope="col">Areas</th><th scope="col">Managers</th><th scope="col">Published fees</th><th scope="col">Typical fee</th><th scope="col">Typical nightly rate</th></tr></thead>
            <tbody>{m.cities.map((c) => (
              <tr key={c.city}><th scope="row">{c.city}</th><td>{c.areas}</td><td>{c.managers}</td><td>{feeRange(c.fee) || 'On request'}</td><td>{c.fee.mid != null ? `${c.fee.mid}%` : '–'}</td><td>{c.nightly ? `A$${c.nightly}` : '–'}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>By area</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th scope="col">Area</th><th scope="col">Managers</th><th scope="col">Homes they run nearby</th><th scope="col">Published fees</th><th scope="col">Typical fee</th><th scope="col">Typical nightly rate</th><th scope="col">Guest rating nearby</th></tr></thead>
            <tbody>{areas.map((a) => (
              <tr key={a.slug}><th scope="row"><Link href={`/areas/${a.slug}`}>{a.label}</Link> <span className="hint">{a.state.toUpperCase()}</span></th><td>{a.managers}</td><td>{a.homes.toLocaleString('en-AU')}</td><td>{feeRange(a.fee) || 'On request'}</td><td>{a.fee.mid != null ? `${a.fee.mid}%` : '–'}</td><td>{a.nightly ? `A$${a.nightly}` : '–'}</td><td>{a.rating ? `${a.rating.toFixed(2)} ★` : '–'}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>How these figures are worked out</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
          <li>A manager covers an area if they run at least one short-term rental within 4 km of its centre.</li>
          <li>Fees are only from managers who publish one, on their own website or their CoHostCompare profile. The typical fee is the median of each manager’s mid-point. Fees on unclaimed profiles haven’t been confirmed by the manager.</li>
          <li>Homes, nightly rates and guest ratings are estimates from public listings over the last 12 months{m.dataAsOf ? `, with listing data as of ${fmtDate(m.dataAsOf)}` : ''}. We never show individual listings.</li>
          <li>Figures update automatically as managers and listing data change. This page was last worked out on {date}.</li>
        </ul>
        <DataSource />
      </section>

      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>About CoHostCompare</h2>
        <p style={{ margin: 0 }}>{POSITIONING}</p>
        <p style={{ margin: 0 }}>Short-stay rules by state: {RULES.map((r, i) => <span key={r.code}>{i ? ' · ' : ''}<Link href={`/rules/${r.code}`}>{r.code.toUpperCase()}</Link></span>)}. Media enquiries: hello@cohostcompare.com.</p>
      </section>
    </main>
  );
}
