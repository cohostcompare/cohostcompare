import type { Metadata } from 'next';
import Link from 'next/link';
import DataSource from '@/components/DataSource';
import JsonLd from '@/components/JsonLd';
import Photo from '@/components/Photo';
import EarningsTool from './EarningsTool';
import { market } from '@/lib/market';
import { breadcrumbs, faqPage } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Airbnb earnings calculator for Australian homes',
  description: 'Free short-stay earnings estimate for your Australian property: likely booking revenue, occupancy and nightly rate from the last 12 months in your area.',
  alternates: { canonical: '/earnings' },
};

const FAQS: [string, string][] = [
  ['How accurate is the estimate?', 'It is based on how similar homes in your market performed over the last 12 months, so it is a realistic starting point, not a forecast for your property. Expect your own result to vary with photos, pricing, reviews, furnishing and how many nights you make the home available.'],
  ['Is the estimate before or after fees?', 'The headline figure is gross booking revenue. Below it we show what a manager would typically take, using the typical published fee of managers on CoHostCompare, so you can see the likely net before cleaning, platform fees and running costs.'],
  ['Does it account for the rules in my state?', 'No. Night caps, registration and strata rules can limit how many nights you can host, which lowers the result. Check the rules for your state before you decide.'],
  ['Where does the data come from?', 'Aggregated short-term rental market data from AirROI, plus the published fees of managers on CoHostCompare. We never show individual listings or hosts.'],
  ['Do I need an account?', 'No. You can estimate a few different places a day without one. Sign in free to run more.'],
];

type SP = Promise<{ lat?: string; lng?: string; place?: string; beds?: string }>;

export default async function Earnings({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const lat = Number(sp.lat), lng = Number(sp.lng);
  const mid = (await market()).fee.mid;
  const fee = mid ?? 20;
  const initial = sp.lat && sp.lng && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng, label: (sp.place || '').slice(0, 120), beds: Math.min(5, Math.max(0, Number(sp.beds) || 2)) } : null;
  return (
    <main style={{ paddingBlock: '16px 64px', display: 'grid', gap: 28 }}>
      <header className="split">
        <div style={{ display: 'grid', gap: 10 }}>
          <span className="label" style={{ color: 'var(--brand)' }}>Free earnings estimate</span>
          <h1 style={{ fontSize: 'clamp(32px,5vw,48px)', margin: 0 }}>What could your property earn as a short stay?</h1>
          <p className="lede">Enter the address and number of bedrooms. We&apos;ll estimate a year&apos;s booking revenue from how similar homes nearby performed over the last 12 months. It&apos;s free and instant, with no account and no contact details needed.</p>
        </div>
        <Photo name="bondi" ratio="3 / 2" eager sizes="(max-width: 880px) 100vw, 480px" />
      </header>
      <EarningsTool initial={initial} feePct={fee} />

      <section className="panel" id="how-it-works" style={{ display: 'grid', gap: 10, maxWidth: 820 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>How the estimate is worked out</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
          <li>We look at how short-term rentals in your market performed over the last 12 months: average occupancy and nightly rate, aggregated across listings (never one home).</li>
          <li>We adjust for your number of bedrooms, using how homes of that size earn relative to the typical home in the areas we cover.</li>
          <li>Booking revenue is nightly rate × nights booked for a year. The management fee shown is the typical published fee of managers on CoHostCompare{mid != null ? ` (currently ${mid}% of booking income)` : ''}.</li>
        </ol>
        <p className="hint" style={{ margin: 0 }}>It&apos;s a market-based estimate, not a valuation or a promise: your photos, pricing, reviews, furnishing and the rules in your area all move the result. Managers quote on your actual property. <DataSource /></p>
      </section>

      <section style={{ display: 'grid', gap: 10, maxWidth: 820 }} aria-labelledby="earn-faq">
        <JsonLd data={[breadcrumbs([['Home', '/'], ['What could I earn?', '/earnings']]), faqPage(FAQS)]} />
        <h2 id="earn-faq" style={{ fontSize: 22, margin: 0 }}>Common questions</h2>
        <div className="faq-list">{FAQS.map(([q, a]) => <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>)}</div>
        <p style={{ margin: 0 }}><Link href="/">Compare the managers who cover your address →</Link> · <Link href="/rules">Check the rules in your state →</Link></p>
      </section>
    </main>
  );
}
