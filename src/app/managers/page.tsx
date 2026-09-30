import type { Metadata } from 'next';
import ManagerSignup from '@/components/ManagerSignup';
import Photo from '@/components/Photo';
import InterestForm from '@/app/interest/InterestForm';
import { SUCCESS_FEE_TEXT, ENTERPRISE_FEATURES, ENTERPRISE_PRICE_SHORT, foundingDeadlineText, PRO_FEATURES, PRO_PRICE_SHORT } from '@/lib/pro';

export const metadata: Metadata = {
  title: 'For short-term rental managers',
  description: 'Get found by property owners looking for a short-term rental manager in your area. Free listing during launch.',
};

const faqs: [string, string][] = [
  ['What does it cost?', `Your profile, owner quote requests and replies are free, with no lock-in. The Free plan includes 4 accepted clients a month, introduced to you straight away, then ${SUCCESS_FEE_TEXT} each. Pro and Enterprise include unlimited clients, and founding managers get Pro free for three months.`],
  ['Why do you show my fees?', 'Owners compare on fees first. We show a fee band publicly and the full breakdown only to signed-in owners, in the same format for every manager, so you are compared fairly.'],
  ['Where do the ratings come from?', 'From the public guest ratings on the listings you manage, combined across your portfolio and labelled as estimates. See “How we build manager profiles” above.'],
  ['How did you get my business’s details?', 'From public sources only: public short-term rental listing data (via AirROI) and your own website. We don’t buy contact lists. If we emailed you, it’s because your business publishes that address on its website.'],
  ['Can I pay to rank higher?', 'No. Nobody can pay to appear higher, change their rating or change how quotes are compared. Paid plans only add tools for you, like benchmarks and owner demand, and owners can’t see who has one.'],
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
      <section id="pricing" className="band" style={{ display: 'grid', gap: 22, scrollMarginTop: 96 }}>
        <div style={{ maxWidth: 760, display: 'grid', gap: 8 }}>
          <span className="label" style={{ color: 'var(--brand)' }}>Pricing</span>
          <h2 style={{ fontSize: 'clamp(26px,3.6vw,34px)', margin: 0 }}>Free to be found. Paid plans if you want more.</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Everything owners see is free and the same for every manager. Paid plans add tools for your business. They never change where you appear, your ratings or how quotes are compared, and owners can&apos;t see who pays.</p>
        </div>
        <div className="plans">
          <div className="panel plan">
            <h3>Free</h3>
            <p className="price"><b>$0</b> <span className="hint">a month</span></p>
            <ul className="ticks">
              <li className="done">Your profile, fees, services, logo and 12 photos</li>
              <li className="done">Unlimited quote requests and replies</li>
              <li className="done">1 login</li>
              <li className="done">4 accepted clients a month, then {SUCCESS_FEE_TEXT} each</li>
              <li className="done">Verified business badge when your ABN checks out</li>
              <li className="done">Search appearances, profile views and requests on your dashboard</li>
            </ul>
          </div>
          <div className="panel plan" style={{ borderColor: 'var(--brand)' }}>
            <h3>Pro</h3>
            <p className="price"><b>{PRO_PRICE_SHORT}</b> <span className="hint">a month + GST</span></p>
            <p className="hint" style={{ margin: 0 }}><b style={{ color: 'var(--brand)' }}>Founding offer:</b> claim your profile by {foundingDeadlineText()} and get Pro free for three months. No card needed.</p>
            <p style={{ margin: 0, fontWeight: 600 }}>Everything in Free, plus:</p>
            <ul className="ticks">{PRO_FEATURES.map((f) => <li key={f.title} className={f.live ? 'done' : ''}><b>{f.title}.</b> {f.body}{f.live ? '' : ' Coming soon.'}</li>)}</ul>
          </div>
          <div className="panel plan">
            <h3>Enterprise</h3>
            <p className="price"><b>From {ENTERPRISE_PRICE_SHORT}</b> <span className="hint">a month + GST</span></p>
            <p className="hint" style={{ margin: 0 }}>For operators with homes in several regions. We&apos;re building it with our first Enterprise operators, so talk to us about what you need.</p>
            <p style={{ margin: 0, fontWeight: 600 }}>Everything in Pro, plus:</p>
            <ul className="ticks">{ENTERPRISE_FEATURES.map((f) => <li key={f.title} className={f.live ? 'done' : ''}><b>{f.title}.</b> {f.body}</li>)}</ul>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--brand)' }}>Talk to us about Enterprise</summary>
              <div style={{ marginTop: 10 }}><InterestForm kind="enterprise" partner button="Send" noteLabel="How many homes, and which regions? (optional)" done="Thanks. We’ll be in touch by email." /></div>
            </details>
          </div>
        </div>
        <p className="hint" style={{ margin: 0 }}>Launch prices in Australian dollars. Subscribe during launch and your price is fixed for 12 months. We&apos;ll always ask before your first charge, and you can cancel any time. <a href="/terms#paid-plans">Paid plan terms</a></p>
      </section>
      <section id="why-listed" className="band" style={{ display: 'grid', gap: 22, scrollMarginTop: 96 }}>
        <div style={{ maxWidth: 760, display: 'grid', gap: 8 }}>
          <span className="label" style={{ color: 'var(--brand)' }}>Why is my business listed?</span>
          <h2 style={{ fontSize: 'clamp(26px,3.6vw,34px)', margin: 0 }}>How we build manager profiles</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Owners deserve to see every manager who operates near them, not just the ones who advertise. So we build a starting profile for every identifiable short-term rental business we find, from public information. Every business is measured the same way, which keeps the comparison fair.</p>
        </div>
        <div className="facts-grid">
          <div className="panel"><h3>Where the data comes from</h3><p>Figures come from public short-term rental listings, supplied by the data provider AirROI (www.airroi.com). For each business we count the homes it manages and combine their public guest ratings, review counts and nightly rates over the last 12 months. We don&apos;t show nights booked, because Airbnb data can&apos;t see bookings made through Stayz, Booking.com or your own website. Business details such as your website and services come from your own public website.</p></div>
          <div className="panel"><h3>What we show, and what we don&apos;t</h3><p>We show totals and averages across your portfolio, labelled as estimates. We never show individual listings, addresses, photos or guest details, and we don&apos;t write reviews. Fees appear only where you publish them or set them yourself. Otherwise owners see &ldquo;Fee on request&rdquo;.</p></div>
          <div className="panel"><h3>The same rules for everyone</h3><p>Every manager is measured the same way, from the same data. No one can pay to change their rating or their place in results, and quote comparisons use the same format for every manager. Private individuals who co-host a home or two don&apos;t get a profile unless they create one.</p></div>
          <div className="panel"><h3>You&apos;re in control</h3><p>Claim your profile for free to correct anything, add your fees, services, logo and photos, and reply to owners directly. If something looks wrong, email us and we&apos;ll check it. If you&apos;d rather not be listed at all, email <a href="mailto:hello@cohostcompare.com">hello@cohostcompare.com</a> from your business address and we&apos;ll remove your profile.</p></div>
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
