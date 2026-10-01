import type { Metadata } from 'next';
import Link from 'next/link';
import OfferCard from '@/components/OfferCard';
import Photo from '@/components/Photo';
import { CATEGORIES } from '@/lib/partners';
import PartnerForm, { LinkForm } from './PartnerForm';

export const metadata: Metadata = {
  title: 'Partner with CoHostCompare',
  description: 'Offer your services to Australian owners setting up a short-term rental: insurance, photography, cleaning, smart locks, furnishing and more. Free to apply.',
  alternates: { canonical: '/partners' },
};

const ICONS: Record<string, { icon: string; tone: string; blurb: string }> = {
  'Insurance': { icon: '🛡️', tone: 't1', blurb: 'Cover for paying guests, contents and liability' },
  'Cleaning and linen': { icon: '🧺', tone: 't2', blurb: 'Turnovers, linen hire and deep cleans' },
  'Photography': { icon: '📸', tone: 't3', blurb: 'Listing photos, video and floor plans' },
  'Furnishing and styling': { icon: '🛋️', tone: 't4', blurb: 'Furniture packages and styling' },
  'Smart locks and access': { icon: '🔑', tone: 't5', blurb: 'Smart locks, lockboxes and installation' },
  'Maintenance and handyman': { icon: '🛠️', tone: 't6', blurb: 'Repairs, gardens, pools and trades' },
  'Accounting and tax': { icon: '📊', tone: 't7', blurb: 'Tax, GST, depreciation and bookkeeping' },
};

const EXAMPLE = { id: 'example', name: 'Harbourlight Studio', category: 'Photography', offer_title: '15% off your first listing shoot', offer_body: 'Bright, wide-angle photos of every room, edited and ready for Airbnb within 48 hours. Floor plans available.', promo_code: 'COHOST15', areas: 'Sydney and the Central Coast', logo_url: null, referral_fee: false };

export default function Partners() {
  return (
    <main className="partners" style={{ paddingBlock: '16px 72px', display: 'grid', gap: 44 }}>
      <header className="split">
        <div style={{ display: 'grid', gap: 14 }}>
          <span className="label" style={{ color: 'var(--brand)' }}>For businesses</span>
          <h1 style={{ fontSize: 'clamp(32px,5vw,50px)', margin: 0 }}>Reach owners getting their home ready for guests</h1>
          <p className="lede" style={{ margin: 0 }}>CoHostCompare helps Australian property owners compare short-term rental managers. Many are setting up a home for guests for the first time, and need insurance, photos, cleaning, locks, furniture and good advice. Put your offer in front of them.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a className="btn primary" href="#apply">Apply to be a partner</a>
            <a className="btn secondary" href="#link">Already a partner?</a>
          </div>
          <ul className="earn-trust" style={{ margin: 0 }}><li>Free to apply</li><li>Checked by hand</li><li>Clearly labelled to owners</li></ul>
        </div>
        <div className="hero-photo">
          <Photo name="making" ratio="4 / 3" eager sizes="(max-width: 880px) 100vw, 520px" />
          <div className="float"><b>Owners, not cold leads</b><span className="hint">People actively setting up a short-term rental, at the moment they need you.</span></div>
        </div>
      </header>

      <section style={{ display: 'grid', gap: 16 }}>
        <h2 style={{ fontSize: 'clamp(24px,3.4vw,32px)', margin: 0 }}>Who we&apos;re looking for</h2>
        <div className="cat-grid">
          {CATEGORIES.filter((c) => ICONS[c]).map((c) => (
            <div key={c} className={`cat ${ICONS[c].tone}`}><span className="ico" aria-hidden="true">{ICONS[c].icon}</span><b>{c}</b><span>{ICONS[c].blurb}</span></div>
          ))}
        </div>
        <p className="hint" style={{ margin: 0 }}>Something else owners need? Apply under &quot;Other&quot; and tell us about it.</p>
      </section>

      <section className="partner-band">
        <div style={{ display: 'grid', gap: 18 }}>
          <h2 style={{ fontSize: 'clamp(24px,3.4vw,32px)', margin: 0 }}>How it works</h2>
          <ol className="steps3">
            <li><span>1</span><div><b>Apply in two minutes</b><p>Tell us about your business and the offer you&apos;d like owners to see.</p></div></li>
            <li><span>2</span><div><b>We check it by hand</b><p>We only list businesses and offers that are genuinely useful to owners, and agree any referral fee with you first.</p></div></li>
            <li><span>3</span><div><b>Owners click through to you</b><p>Your offer appears in our owner setup guide. Owners go straight to your site, and your partner page shows how many clicked.</p></div></li>
          </ol>
        </div>
        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <span className="label">What owners see</span>
          <OfferCard o={EXAMPLE} preview />
          <span className="hint">An example offer. Yours shows your logo, offer and any promo code.</span>
        </div>
      </section>

      <section className="photo-pair">
        <figure><Photo name="bed" ratio="16 / 10" sizes="(max-width: 880px) 100vw, 460px" /><figcaption>Cleaning, linen and styling</figcaption></figure>
        <figure><Photo name="keys" ratio="16 / 10" sizes="(max-width: 880px) 100vw, 460px" /><figcaption>Keys, locks and access</figcaption></figure>
      </section>

      <section className="facts-grid">
        <div className="panel" style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>Our promise to owners</h2>
          <ul className="ticks" style={{ margin: 0 }}>
            <li>Partner offers are always labelled, and say whether we earn a referral fee.</li>
            <li>They only appear in our owner setup guide, never in manager results or quote comparisons.</li>
            <li>We never share owners&apos; details with partners. Owners choose to click through to you.</li>
          </ul>
        </div>
        <div className="panel" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>Questions</h2>
          <details><summary><b>What does it cost?</b></summary><p style={{ margin: '6px 0 0' }}>Applying is free. If we agree a referral fee, it&apos;s only on owners who take up your offer, and we agree it with you before your offer goes live.</p></details>
          <details><summary><b>Can I change my offer later?</b></summary><p style={{ margin: '6px 0 0' }}>Yes. You get a private partner page to update your offer and see your clicks at any time.</p></details>
          <details><summary><b>Do I get owners&apos; contact details?</b></summary><p style={{ margin: '6px 0 0' }}>No. Owners click through to your website or booking page and contact you themselves.</p></details>
          <details><summary><b>Where do you operate?</b></summary><p style={{ margin: '6px 0 0' }}>Across NSW and Victoria, from Sydney and Melbourne to holiday spots like Byron Bay and the Great Ocean Road, with more areas coming. Tell us where you work and we&apos;ll show your offer to the right owners.</p></details>
        </div>
      </section>

      <section id="apply" style={{ display: 'grid', gap: 12, scrollMarginTop: 96 }}>
        <h2 style={{ fontSize: 'clamp(24px,3.4vw,32px)', margin: 0 }}>Apply to be a partner</h2>
        <PartnerForm categories={CATEGORIES} />
      </section>

      <section id="link" className="panel" style={{ display: 'grid', gap: 10, scrollMarginTop: 96 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Already a partner?</h2>
        <p style={{ margin: 0 }}>Enter the email you applied with and we&apos;ll send you the link to your partner page.</p>
        <LinkForm />
      </section>

      <p className="hint" style={{ margin: 0 }}>Questions? Email <a href="mailto:hello@cohostcompare.com">hello@cohostcompare.com</a>. See our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</p>
    </main>
  );
}
