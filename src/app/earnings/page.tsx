import type { Metadata } from 'next';
import Photo from '@/components/Photo';
import EarningsTool from './EarningsTool';

export const metadata: Metadata = {
  title: 'What could my property earn on Airbnb?',
  description: 'Free short-stay earnings estimate for your Australian property: likely booking revenue, occupancy and nightly rate, based on the last 12 months in your area.',
  alternates: { canonical: '/earnings' },
};

type SP = Promise<{ lat?: string; lng?: string; place?: string; beds?: string }>;

export default async function Earnings({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const lat = Number(sp.lat), lng = Number(sp.lng);
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
      <EarningsTool initial={initial} />
    </main>
  );
}
