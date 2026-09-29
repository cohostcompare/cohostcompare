import AddressSearch from '@/components/AddressSearch';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="label" style={{ color: 'var(--brand)' }}>Sydney and Melbourne</div>
        <h1>Compare every short-term rental manager for your property.</h1>
        <p className="lede">See the managers who cover your address, with fees, platforms and real guest ratings side by side. Then request quotes from up to five in one go. Free for owners, and neutral: no manager can pay to change their rating.</p>
        <AddressSearch />
      </section>

      <section id="how" style={{ borderTop: '1px solid var(--line)', paddingBlock: 48 }}>
        <h2 style={{ fontSize: 'clamp(26px,3.6vw,34px)', margin: '0 0 24px' }}>How it works</h2>
        <ol style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24, paddingLeft: 20, margin: 0 }}>
          <li><b>Enter your address.</b><br /><span style={{ color: 'var(--muted)' }}>See every manager who covers it, plus how each performs near you.</span></li>
          <li><b>Compare side by side.</b><br /><span style={{ color: 'var(--muted)' }}>Fees, properties managed, platforms and verified guest ratings.</span></li>
          <li><b>Request quotes in one go.</b><br /><span style={{ color: 'var(--muted)' }}>Describe your property once and get comparable quotes back from up to five managers.</span></li>
        </ol>
      </section>
    </main>
  );
}
