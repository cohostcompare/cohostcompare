import type { Metadata } from 'next';
import Link from 'next/link';
import OfferCard from '@/components/OfferCard';
import { liveOffers } from '@/lib/partners';
import { SETUP_STEPS as STEPS } from '@/lib/setupSteps';
import GuideSignup from '@/components/GuideSignup';

export const metadata: Metadata = {
  title: 'Setting up your short-term rental',
  description: 'A practical checklist for Australian owners getting a home ready for short stays: rules and registration, insurance, photos, cleaning, keys and furnishing.',
  alternates: { canonical: '/setup' },
};


// Partner offers show only when switched on in /admin/partners and at least one partner is approved.
export const revalidate = 600;

export default async function Setup() {
  const offers = await liveOffers();
  return (
    <main style={{ maxWidth: 920, paddingBlock: '16px 64px', display: 'grid', gap: 26 }}>
      <div style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
        <span className="label" style={{ color: 'var(--brand)' }}>For owners</span>
        <h1 style={{ fontSize: 'clamp(30px,4.6vw,44px)', margin: 0 }}>Setting up your short-term rental</h1>
        <p className="lede" style={{ margin: 0 }}>A practical checklist for getting your home ready for guests, with the questions to ask each manager when you compare quotes.</p>
      </div>

      <GuideSignup />

      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {STEPS.map((s, i) => (
          <li key={s.title} className="panel" style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr)', gap: 14 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--brand)' }}>{String(i + 1).padStart(2, '0')}</span>
            <div style={{ display: 'grid', gap: 6 }}>
              <h2 style={{ fontSize: 20, margin: 0 }}>{s.title}</h2>
              <p style={{ margin: 0 }}>{s.body}{s.link && <> <Link href={s.link.href}>{s.link.label}</Link>.</>}</p>
              <p className="hint" style={{ margin: 0 }}><b>Ask your manager:</b> {s.ask}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="panel" style={{ display: 'grid', gap: 8, background: 'var(--tint)' }}>
        <b>Ready to compare managers?</b>
        <p style={{ margin: 0 }}>Enter your address to see every manager running homes near you, then request quotes from up to five in one go. It&apos;s free.</p>
        <div><Link className="btn primary" href="/">Compare managers</Link></div>
      </section>

      {offers.length > 0 && (
        <section id="partners" style={{ display: 'grid', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 26, scrollMarginTop: 96 }}>
          <span className="label">Partner offers</span>
          <h2 style={{ fontSize: 'clamp(24px,3.4vw,30px)', margin: 0 }}>Offers for owners setting up</h2>
          <p style={{ margin: 0, maxWidth: 720 }}>Offers from partner businesses. We check the business is real and the offer is accurate; we haven&apos;t used their services and don&apos;t vouch for them. Each one says if we earn a referral fee when you use it. Partners never affect which managers you see, their ratings or how quotes are compared, and we never share your details with them.</p>
          <div className="offers">
            {offers.map((o) => <OfferCard key={o.id} o={o} />)}
          </div>
        </section>
      )}
    </main>
  );
}
