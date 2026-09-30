import Link from 'next/link';
import AddressSearch from '@/components/AddressSearch';
import HeroCarousel from '@/components/HeroCarousel';
import Photo from '@/components/Photo';

export default function Home() {
  return (
    <main>
      <section className="split" style={{ paddingBlock: '36px 56px' }}>
        <div style={{ display: 'grid', gap: 22 }}>
          <div className="label" style={{ color: 'var(--brand)' }}>Sydney, Melbourne and NSW and Victorian holiday spots</div>
          <h1 style={{ fontSize: 'clamp(34px, 5.2vw, 54px)', margin: 0 }}>Compare every short-term rental manager for your property.</h1>
          <p className="lede">See the managers who cover your address, with fees, platforms and real guest ratings side by side. Then request quotes from up to five managers in one go. Free for owners, and neutral: no manager can pay to change their rating.</p>
          <div className="hero-search"><AddressSearch /></div>
          <p style={{ margin: 0 }}><Link href="/earnings"><b>Not listed yet? See what your property could earn →</b></Link></p>
        </div>
        <div className="hero-photo">
          <HeroCarousel sizes="(max-width: 880px) 100vw, 520px" />
        </div>
      </section>

      <section className="steps" aria-labelledby="how">
        <div className="steps-head">
          <span className="label">How it works</span>
          <h2 id="how">Three steps. Up to five quotes. Zero sales calls.</h2>
        </div>
        <ol>
          <li>
            <span className="num">01</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <h3>Search</h3>
            <p>Type your address. See every manager running homes near you, not just the ones who advertise.</p>
          </li>
          <li>
            <span className="num">02</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
            <h3>Compare</h3>
            <p>Fees, guest ratings, homes nearby and platforms, side by side, from the same data for everyone.</p>
          </li>
          <li>
            <span className="num">03</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            <h3>Choose</h3>
            <p>Describe your property once. Get quotes back in one format, ask questions, and accept the best fit.</p>
          </li>
        </ol>
        <div className="steps-foot">
          <span><b>$0</b> for owners, always</span>
          <Link className="btn secondary" href="/how-it-works">See the details →</Link>
        </div>
      </section>

      <section className="band">
        <h2 style={{ fontSize: 'clamp(26px,3.6vw,34px)', margin: '0 0 8px' }}>Sydney, Melbourne and the holiday coast</h2>
        <p className="lede" style={{ marginBottom: 24 }}>We&apos;ve mapped the managers running short-term rentals across Sydney and Melbourne, plus NSW and Victorian holiday spots from Byron Bay and the Blue Mountains to the Great Ocean Road and Daylesford. More areas soon. <Link href="/areas">Browse by area →</Link></p>
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
      </section>

      <section className="ask-cta" aria-label="Ask about short-stay rules">
        <div>
          <h2 style={{ fontSize: 'clamp(22px,3vw,28px)', margin: '0 0 4px' }}>What are the short-stay rules in your area?</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Ask anything about registration, night caps, levies or strata rules, and get a plain-English answer with the official source.</p>
        </div>
        <form action="/rules" method="get">
          <label htmlFor="home-ask" className="sr-only">Your question</label>
          <input id="home-ask" className="field" name="q" placeholder="e.g. Can my strata ban Airbnb?" style={{ minWidth: 260, background: 'var(--panel)' }} />
          <button className="btn primary" type="submit">Ask</button>
        </form>
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
