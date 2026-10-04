import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { POSITIONING, faqPage } from '@/lib/seo';
import AddressSearch from '@/components/AddressSearch';
import ComparisonPreview from '@/components/ComparisonPreview';
import CoverageMap from '@/components/CoverageMap';
import HeroBackdrop from '@/components/HeroBackdrop';
import Photo from '@/components/Photo';
import { areas } from '@/lib/areas';
import RulesTrust from '@/components/RulesTrust';

export const metadata: Metadata = {
  title: { absolute: 'CoHostCompare: compare Airbnb and short-term rental managers in Australia' },
  description: 'Compare the Airbnb and short-term rental managers who cover your address: fees, guest ratings and homes they run nearby, side by side. Request up to five quotes free. Unbiased, with no paid rankings.',
  alternates: { canonical: '/' },
};

const faqs: [string, string][] = [
  ['What is CoHostCompare?', POSITIONING],
  ['Is it free for owners?', 'Yes. Owners never pay. Searching, comparing and requesting quotes are free, and there are no sales calls: managers reply in your inbox here.'],
  ['How do you decide which managers cover my address?', 'A manager covers your address if they already run at least one short-term rental within 4 km of it, based on public listing data. Some also cover areas they list on their own website.'],
  ['Can managers pay to rank higher?', 'No. No manager can pay for placement, ranking, ratings or badges. You choose how results are sorted, for example by guest rating near you or homes nearby.'],
  ['Where do the ratings and home counts come from?', 'From public guest ratings on the short-term rental listings each manager runs, over the last 12 months, via AirROI. They are estimates, and we never show individual listings.'],
  ['When does a manager get my contact details?', 'Only after you accept their quote. Until then you message them through CoHostCompare.'],
  ['Which areas do you cover?', 'Sydney, Melbourne and holiday spots across NSW and Victoria. The map above shows every area, and more are coming.'],
];

export const revalidate = 1800;

export default async function Home() {
  const all = await areas().catch(() => []);
  return (
    <main>
      <section className="home-hero">
        <HeroBackdrop />
      <div className="split">
        <div className="hero-left">
          <h1 className="hero-h1"><span>Compare short-term</span> <span>rental managers</span> <span>near you</span></h1>
          <p className="lede">Fees, guest ratings and homes they run nearby, side by side. Free for owners and unbiased.</p>
          <div className="hero-actions">
            <div className="hero-search"><AddressSearch /></div>
          </div>
          <div className="hero-or">
            <span className="hint">or</span>
            <Link href="/earnings" className="btn-earn"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.7 0-2.8.8-2.8 2s1 1.7 2.8 2 2.8.8 2.8 2-1.1 2-2.8 2c-1.3 0-2.4-.5-2.9-1.3M12 6.5V8m0 8v1.5" /></svg>See what your property could earn</Link>
          </div>
        </div>
        <div className="hero-right">
          <ol className="flow-strip" aria-label="How it works, in short">
            <li><b>1</b> Search your address</li>
            <li><b>2</b> Compare managers</li>
            <li><b>3</b> Request up to 5 quotes</li>
          </ol>
          <ComparisonPreview />
        </div>
      </div>
      </section>

      <section className="steps home-steps" aria-labelledby="how">
        <div className="steps-head">
          <span className="label">How it works</span>
          <h2 id="how">Compare managers in three steps. Up to five quotes. Zero sales calls.</h2>
        </div>
        <ol>
          <li>
            <span className="num" aria-hidden="true">01</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <h3>Search</h3>
            <p>Type your address. See every manager running homes near you, not just the ones who advertise.</p>
          </li>
          <li>
            <span className="num" aria-hidden="true">02</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
            <h3>Compare</h3>
            <p>Compare fees, guest ratings, homes nearby and platforms side by side, from the same data for everyone.</p>
          </li>
          <li>
            <span className="num" aria-hidden="true">03</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            <h3>Choose</h3>
            <p>Describe your property once. Compare quotes in one format, ask questions, and accept the best fit.</p>
          </li>
        </ol>
        <div className="steps-foot">
          <span><b>$0</b> for owners, always</span>
          <Link className="btn secondary" href="/how-it-works">See the details →</Link>
        </div>
      </section>

      <section className="rules-cta" aria-label="Short-stay rules">
        <span className="ico-big" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg></span>
        <div style={{ display: 'grid', gap: 4 }}>
          <h2 style={{ fontSize: 'clamp(20px,2.6vw,24px)', margin: 0 }}>Know the short-stay rules before you list</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Registration, night caps, levies and strata rules in plain English, for your state.</p>
          <RulesTrust style={{ fontSize: 13 }} />
        </div>
        <form action="/rules" method="get">
          <label htmlFor="home-ask" className="sr-only">Your question about the rules</label>
          <input id="home-ask" className="field" name="q" placeholder="e.g. Can my strata ban Airbnb?" />
          <button className="btn primary" type="submit">Ask</button>
        </form>
      </section>

      <section className="band" id="coverage" aria-labelledby="coverage-h">
        <h2 id="coverage-h" style={{ fontSize: 'clamp(26px,3.6vw,34px)', margin: '0 0 8px' }}>Where you can compare managers</h2>
        <p className="lede" style={{ marginBottom: 18 }}>Sydney, Melbourne and holiday spots across NSW and Victoria. Tap an area to compare the managers there.</p>
        <CoverageMap areas={all.map((a) => ({ slug: a.slug, label: a.label, city: a.city, lat: a.lat, lng: a.lng }))} />
        <p style={{ margin: '16px 0 0' }}><Link className="btn secondary btn-browse" href="/areas">Browse all areas →</Link></p>
      </section>

      <section className="band split">
        <Photo name="bed" ratio="4 / 3" sizes="(max-width: 880px) 100vw, 520px" />
        <div style={{ display: 'grid', gap: 14 }}>
          <h2 style={{ fontSize: 'clamp(26px,3.6vw,34px)', margin: 0 }}>Unbiased, so you can trust the comparison</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>We&apos;re not a manager. No manager can pay for a better position, and what a manager pays us never changes what you see or how quotes compare. Every manager&apos;s figures come from the same public data, shown the same way, and every quote comes back in the same format.</p>
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
