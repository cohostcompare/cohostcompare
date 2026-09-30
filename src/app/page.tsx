import Link from 'next/link';
import AddressSearch from '@/components/AddressSearch';
import Photo from '@/components/Photo';

export default function Home() {
  return (
    <main>
      <section className="split" style={{ paddingBlock: '36px 56px' }}>
        <div style={{ display: 'grid', gap: 22 }}>
          <div className="label" style={{ color: 'var(--brand)' }}>Sydney and Melbourne</div>
          <h1 style={{ fontSize: 'clamp(34px, 5.2vw, 54px)', margin: 0 }}>Compare every short-term rental manager for your property.</h1>
          <p className="lede">See the managers who cover your address, with fees, platforms and real guest ratings side by side. Then request quotes from up to five managers in one go. Free for owners, and neutral: no manager can pay to change their rating.</p>
          <AddressSearch />
        </div>
        <div className="hero-photo">
          <Photo name="bondi" ratio="4 / 5" eager sizes="(max-width: 880px) 100vw, 520px" />
          <div className="float" aria-hidden="true">
            <b>Up to 5 quotes</b>
            <span className="hint">in one standard format, side by side</span>
          </div>
        </div>
      </section>

      <section className="band">
        <h2 style={{ fontSize: 'clamp(26px,3.6vw,34px)', margin: '0 0 24px' }}>How it works</h2>
        <ol style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24, paddingLeft: 20, margin: 0 }}>
          <li><b>Enter your address.</b><br /><span style={{ color: 'var(--muted)' }}>See every manager who covers it, plus how each performs near you.</span></li>
          <li><b>Compare side by side.</b><br /><span style={{ color: 'var(--muted)' }}>Fees, properties managed, platforms and verified guest ratings.</span></li>
          <li><b>Request quotes in one go.</b><br /><span style={{ color: 'var(--muted)' }}>Describe your property once and get comparable quotes back from up to five managers.</span></li>
        </ol>
        <p style={{ margin: '20px 0 0' }}><Link href="/how-it-works">More on how it works →</Link></p>
      </section>

      <section className="band">
        <h2 style={{ fontSize: 'clamp(26px,3.6vw,34px)', margin: '0 0 8px' }}>Starting in Sydney and Melbourne</h2>
        <p className="lede" style={{ marginBottom: 24 }}>We&apos;re mapping every manager running short-term rentals in both cities, from Bondi to Brunswick. More cities soon.</p>
        <div className="cities">
          <div className="city">
            <Photo name="sydney" ratio="16 / 10" sizes="(max-width: 880px) 100vw, 540px" />
            <div className="over"><b>Sydney</b><span>Know the 180-night cap and registration before you list.</span></div>
          </div>
          <div className="city">
            <Photo name="melbourne" ratio="16 / 10" sizes="(max-width: 880px) 100vw, 540px" />
            <div className="over"><b>Melbourne</b><span>Factor in Victoria&apos;s 7.5% short stay levy.</span></div>
          </div>
        </div>
        <p style={{ margin: '18px 0 0' }}><Link href="/rules">Check the rules in your state →</Link></p>
      </section>

      <section className="band split">
        <Photo name="bed" ratio="4 / 3" sizes="(max-width: 880px) 100vw, 520px" />
        <div style={{ display: 'grid', gap: 14 }}>
          <h2 style={{ fontSize: 'clamp(26px,3.6vw,34px)', margin: 0 }}>Neutral, so you can trust the comparison</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>We&apos;re not a manager, and we don&apos;t earn more when you pick one over another. Every manager&apos;s figures come from the same public data, shown the same way, and every quote comes back in the same format.</p>
          <p style={{ margin: 0 }}><Link href="/why-us">Why use us →</Link></p>
        </div>
      </section>
    </main>
  );
}
