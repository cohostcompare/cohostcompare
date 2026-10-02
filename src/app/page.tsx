import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { POSITIONING, faqPage } from '@/lib/seo';
import AddressSearch from '@/components/AddressSearch';
import HeroCarousel from '@/components/HeroCarousel';
import Photo from '@/components/Photo';

export const metadata: Metadata = {
  title: { absolute: 'CoHostCompare: compare Airbnb and short-term rental managers in Australia' },
  description: 'Compare the Airbnb and short-term rental managers who cover your address: fees, guest ratings and homes they run nearby, side by side. Request up to five quotes free. Neutral: no paid rankings.',
  alternates: { canonical: '/' },
};

const faqs: [string, string][] = [
  ['What is CoHostCompare?', POSITIONING],
  ['Is it free for owners?', 'Yes. Owners never pay. Searching, comparing and requesting quotes are free, and there are no sales calls: managers reply in your inbox here.'],
  ['How do you decide which managers cover my address?', 'A manager covers your address if they already run at least one short-term rental within 4 km of it, based on public listing data. Some also cover areas they list on their own website.'],
  ['Can managers pay to rank higher?', 'No. No manager can pay for placement, ranking, ratings or badges. You choose how results are sorted, for example by guest rating near you or homes nearby.'],
  ['Where do the ratings and home counts come from?', 'From public guest ratings on the short-term rental listings each manager runs, over the last 12 months, via AirROI. They are estimates, and we never show individual listings.'],
  ['When does a manager get my contact details?', 'Only after you accept their quote. Until then you message them through CoHostCompare.'],
  ['Which areas do you cover?', 'Sydney, Melbourne and holiday areas across New South Wales and Victoria, from Byron Bay and the Blue Mountains to the Great Ocean Road and Daylesford. More areas are coming.'],
];

export default function Home() {
  return (
    <main>
      <section className="split" style={{ paddingBlock: '36px 56px' }}>
        <div style={{ display: 'grid', gap: 22 }}>
          <div className="label" style={{ color: 'var(--brand)' }}>Sydney, Melbourne and NSW and Victorian holiday spots</div>
          <h1 style={{ fontSize: 'clamp(34px, 5.2vw, 54px)', margin: 0 }}>Compare every short-term rental manager for your property.</h1>
          <p className="lede">See the managers who cover your address, with fees, platforms and real guest ratings side by side. Then request quotes from up to five managers in one go. Free for owners, and neutral: no manager can pay to change their rating.</p>
          <div className="hero-search"><AddressSearch /></div>
          <p style={{ margin: 0 }}><Link href="/earnings" className="earn-pill"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.7 0-2.8.8-2.8 2s1 1.7 2.8 2 2.8.8 2.8 2-1.1 2-2.8 2c-1.3 0-2.4-.5-2.9-1.3M12 6.5V8m0 8v1.5" /></svg>See what your property could earn →</Link></p>
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

      <section className="band" aria-labelledby="home-faq" style={{ maxWidth: 820 }}>
        <JsonLd data={faqPage(faqs)} />
        <h2 id="home-faq" style={{ fontSize: 'clamp(26px,3.6vw,34px)', margin: '0 0 12px' }}>Common questions</h2>
        <div className="faq-list">
          {faqs.map(([q, a]) => <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>)}
        </div>
        <p style={{ margin: '16px 0 0' }}><Link href="/guides">Guides for owners →</Link> · <Link href="/facts">Market facts →</Link></p>
      </section>
    </main>
  );
}
