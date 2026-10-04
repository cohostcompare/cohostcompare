import type { Metadata } from 'next';
import Link from 'next/link';
import Photo from '@/components/Photo';

export const metadata: Metadata = {
  title: 'Why use us',
  alternates: { canonical: '/why-us' },
  description: 'An unbiased, transparent way to compare short-term rental managers: every manager, every platform, real performance data and no pay-to-rank.',
};

const POINTS: [string, string][] = [
  ['Unbiased by design', 'We’re not a manager. No manager can pay for a better position, and what a manager pays us never changes what you see or how quotes compare. Most “best Airbnb manager” lists are written by managers ranking themselves first.'],
  ['Every manager, every platform', 'Airbnb’s own co-host directory only shows Airbnb co-hosts. We include full-service agencies and managers who list on Booking.com, Stayz and direct booking sites.'],
  ['Performance you can check', 'Home counts, guest ratings and nightly rates are estimates from managers’ public listings, refreshed regularly and shown the same way for everyone. We show where each figure comes from.'],
  ['Fees in the same format', 'Where managers publish fees, we show them. Quotes come back in a standard format, so a 15% fee with a setup charge and a 12-month lock-in can be compared with 18% and no lock-in.'],
  ['No pay-to-rank', 'No manager can pay to appear higher, change a rating or change how quotes are compared. Managers can pay for optional tools for their own business, and owners can’t tell who does.'],
  ['Your details stay yours', 'Managers see your property details and first name. Your email and phone number go only to the manager whose quote you accept.'],
];

export default function WhyUs() {
  return (
    <main style={{ maxWidth: 1000, paddingBlock: '16px 64px', display: 'grid', gap: 28 }}>
      <header className="split">
        <div style={{ display: 'grid', gap: 10 }}>
          <span className="label" style={{ color: 'var(--brand)' }}>Unbiased and transparent</span>
          <h1 style={{ fontSize: 'clamp(32px,5vw,48px)', margin: 0 }}>Why use us</h1>
          <p className="lede">Handing over the keys to your property is a big decision. You should be able to compare every option on the same terms.</p>
        </div>
        <Photo name="keys" ratio="3 / 2" eager sizes="(max-width: 880px) 100vw, 440px" />
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
        {POINTS.map(([t, d]) => (
          <section key={t} className="panel" style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
            <h2 style={{ fontSize: 19, margin: 0 }}>{t}</h2>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{d}</p>
          </section>
        ))}
      </div>
      <p className="hint" style={{ margin: 0 }}>Performance data is based on public listing information from AirROI (<a href="https://www.airroi.com">www.airroi.com</a>). Figures are estimates.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link className="btn primary" href="/">Compare managers near you</Link>
        <Link className="btn secondary" href="/how-it-works">How it works</Link>
      </div>
    </main>
  );
}
