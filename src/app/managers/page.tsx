import type { Metadata } from 'next';
import ManagerSignup from '@/components/ManagerSignup';
import Photo from '@/components/Photo';

export const metadata: Metadata = {
  title: 'For short-term rental managers',
  description: 'Get found by property owners looking for a short-term rental manager in your area. Free listing during launch.',
};

const faqs: [string, string][] = [
  ['What does it cost?', 'Listing is free during launch, including owner quote requests. Paid plans will add featured placement and more service areas; founding managers get locked-in pricing.'],
  ['Why do you show my fees?', 'Owners compare on fees first. We show a fee band publicly and the full breakdown only to signed-in owners, in the same format for every manager, so you are compared fairly.'],
  ['Where do the ratings come from?', 'From the guest reviews on your public listings, combined across your portfolio. You can link listings we have missed from your dashboard.'],
  ['Can I pay to rank higher?', 'You can pay to be featured, and featured results are always labelled. You can never pay to change your rating or your place in rated results.'],
  ['How do quote requests work?', 'An owner describes their property once and sends it to up to five managers. You reply with a quote in a standard format. The owner’s contact details are shared with you if they accept your quote.'],
];

export default function ForManagers() {
  return (
    <main>
      <section className="hero" style={{ maxWidth: 'none', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,.9fr)', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="label" style={{ color: 'var(--brand)' }}>For managers and co-hosts</div>
          <h1>Get found by owners looking for a manager in your area.</h1>
          <p className="lede">Owners search by address, compare managers side by side and send quote requests to the ones they like. Claim your profile, set your service areas and fees, and reply to requests from your dashboard. No sales calls needed.</p>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)', display: 'grid', gap: 6 }}>
            <li>Owner enquiries arrive with property details already filled in</li>
            <li>Your ratings and portfolio shown from real guest reviews</li>
            <li>Every platform you list on, not just Airbnb</li>
          </ul>
        </div>
        <ManagerSignup />
      </section>
      <section className="band split">
        <Photo name="making" ratio="3 / 2" sizes="(max-width: 880px) 100vw, 540px" />
        <div style={{ display: 'grid', gap: 12 }}>
          <h2 style={{ fontSize: 'clamp(26px,3.6vw,34px)', margin: 0 }}>Spend your time on homes, not sales calls</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Owners arrive having already compared you on the numbers that matter. You get the property details up front, reply with a quote in a few minutes, and the owner accepts or asks questions in one place.</p>
        </div>
      </section>
      <section style={{ borderTop: '1px solid var(--line)', paddingBlock: 48, maxWidth: 760 }}>
        <h2 style={{ fontSize: 'clamp(26px,3.6vw,34px)', margin: '0 0 20px' }}>Questions managers ask</h2>
        <div style={{ display: 'grid', gap: 18 }}>
          {faqs.map(([q, a]) => (
            <div key={q}><h3 style={{ fontSize: 18, margin: '0 0 4px' }}>{q}</h3><p style={{ margin: 0, color: 'var(--muted)' }}>{a}</p></div>
          ))}
        </div>
      </section>
    </main>
  );
}
