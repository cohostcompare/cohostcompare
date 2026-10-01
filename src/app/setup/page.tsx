import type { Metadata } from 'next';
import Link from 'next/link';
import OfferCard from '@/components/OfferCard';
import { liveOffers } from '@/lib/partners';

export const metadata: Metadata = {
  title: 'Setting up your short-term rental',
  description: 'A practical checklist for Australian owners getting a home ready for short stays: rules and registration, insurance, photos, cleaning, keys and furnishing.',
  alternates: { canonical: '/setup' },
};

const STEPS: { title: string; body: React.ReactNode; ask: string }[] = [
  {
    title: 'Check the rules and register',
    body: <>Most states and councils have rules for short stays, such as NSW&apos;s register and night caps in some areas, and Victoria&apos;s short stay levy. Strata by-laws can also apply. <Link href="/rules">Check the rules for your area</Link>.</>,
    ask: 'Does my manager handle registration and levy returns, or do I?',
  },
  {
    title: 'Get the right insurance',
    body: <>Many home and landlord policies don&apos;t cover short-term letting, or only with an add-on. Platform host protection programs aren&apos;t the same as insurance. Ask your insurer in writing whether your policy covers paying guests, and check contents and public liability.</>,
    ask: 'What insurance does the manager expect me to hold, and what does theirs cover?',
  },
  {
    title: 'Photos that sell the stay',
    body: <>Listing photos drive bookings more than almost anything else. Many managers include professional photos in their setup fee, so check before you book your own photographer.</>,
    ask: 'Are professional photos included, and who owns them if I change managers?',
  },
  {
    title: 'Cleaning, linen and consumables',
    body: <>Cleaning is usually charged to guests per stay, but linen hire, consumables and deep cleans may be billed to you. Compare how each manager handles this, as it changes your real costs.</>,
    ask: 'Who pays for cleaning, linen and consumables, and how are they charged?',
  },
  {
    title: 'Keys and access',
    body: <>A smart lock or lockbox makes late check-ins easy and saves key handover fees. If you&apos;re in a strata building, check the by-laws before installing anything on the front door.</>,
    ask: 'How do guests get in, and is there a fee for key handover?',
  },
  {
    title: 'Furnishing and styling',
    body: <>Guests expect a well-equipped kitchen, good beds, fast Wi-Fi and a workspace. Some managers offer styling or furniture packages, often for a one-off fee.</>,
    ask: 'Is there a styling or setup fee, and what does it include?',
  },
];

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

      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {STEPS.map((s, i) => (
          <li key={s.title} className="panel" style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr)', gap: 14 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--brand)' }}>{String(i + 1).padStart(2, '0')}</span>
            <div style={{ display: 'grid', gap: 6 }}>
              <h2 style={{ fontSize: 20, margin: 0 }}>{s.title}</h2>
              <p style={{ margin: 0 }}>{s.body}</p>
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
          <p style={{ margin: 0, maxWidth: 720 }}>Offers from businesses we&apos;ve checked. They&apos;re partner offers, so each one says if we earn a referral fee when you use it. Partners never affect which managers you see, their ratings or how quotes are compared, and we never share your details with them.</p>
          <div className="offers">
            {offers.map((o) => <OfferCard key={o.id} o={o} />)}
          </div>
        </section>
      )}
    </main>
  );
}
