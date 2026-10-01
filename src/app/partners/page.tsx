import type { Metadata } from 'next';
import { CATEGORIES } from '@/lib/partners';
import PartnerForm from './PartnerForm';

// Shared by direct link with businesses we invite. Not linked from the site or indexed until offers go live.
export const metadata: Metadata = { title: 'Partner with CoHostCompare', robots: { index: false, follow: false } };

export default function Partners() {
  return (
    <main style={{ maxWidth: 760, paddingBlock: '16px 64px', display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <span className="label" style={{ color: 'var(--brand)' }}>For businesses</span>
        <h1 style={{ fontSize: 'clamp(30px,4.6vw,42px)', margin: 0 }}>Offer your services to owners setting up a short stay</h1>
        <p className="lede" style={{ margin: 0 }}>CoHostCompare helps Australian owners compare short-term rental managers. Many are setting up a home for guests for the first time, and need insurance, photos, cleaning, locks, furniture and good advice.</p>
      </div>
      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>How it works</h2>
        <ul className="ticks" style={{ margin: 0 }}>
          <li>Your offer appears in the partner offers on our owner setup guide, clearly labelled as a partner offer.</li>
          <li>Owners click through to you directly. We never share owners&apos; details with partners.</li>
          <li>You get a private page to update your offer and see how many owners clicked it.</li>
          <li>We check every partner by hand and only list offers that are genuinely useful to owners.</li>
          <li>Any referral fee is agreed with you before your offer goes live, and owners are told when we earn one.</li>
        </ul>
      </section>
      <PartnerForm categories={CATEGORIES} />
      <p className="hint" style={{ margin: 0 }}>Partner offers never affect which managers owners see, their ratings or how quotes are compared. Questions? Email hello@cohostcompare.com.</p>
    </main>
  );
}
