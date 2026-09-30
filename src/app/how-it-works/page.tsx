import type { Metadata } from 'next';
import Link from 'next/link';
import Photo from '@/components/Photo';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'Find, compare and get quotes from short-term rental managers who cover your property, in one place and without sales calls.',
};

const STEPS: [string, string][] = [
  ['Enter your address or suburb', 'We show every manager running short-term rentals near you, from Airbnb co-hosts to full-service agencies. Buying? A suburb works too.'],
  ['Compare them side by side', 'See how many homes each manager runs near you, their guest ratings and their average nightly rate. Where managers publish fees, you see those too.'],
  ['Sign in free for the full picture', 'A free account shows each manager’s full fees and contract terms, and how they perform around your address.'],
  ['Request quotes from up to five managers', 'Describe your property once. Each manager replies with a quote in the same format, so fees, setup costs, lock-in and what’s included line up.'],
  ['Choose, with everything in one inbox', 'Message managers, compare quotes and accept the one you want. Your contact details are shared only with the manager you choose.'],
];

export default function HowItWorks() {
  return (
    <main style={{ paddingBlock: '16px 64px', display: 'grid', gap: 28 }}>
      <header className="split">
        <div style={{ display: 'grid', gap: 10 }}>
          <span className="label" style={{ color: 'var(--brand)' }}>For property owners and investors</span>
          <h1 style={{ fontSize: 'clamp(32px,5vw,48px)', margin: 0 }}>How it works</h1>
          <p className="lede">Finding a short-term rental manager usually means a dozen websites, sales calls and fee structures you can’t compare. We put them side by side, for free.</p>
        </div>
        <Photo name="bed" ratio="3 / 2" eager sizes="(max-width: 880px) 100vw, 500px" />
      </header>
      <div style={{ maxWidth: 820, display: 'grid', gap: 28 }}>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 18, counterReset: 's' }}>
        {STEPS.map(([t, d], i) => (
          <li key={t} className="panel" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'start' }}>
            <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 28, color: 'var(--brand)', lineHeight: 1 }}>{i + 1}</span>
            <div><h2 style={{ fontSize: 20, margin: '0 0 4px' }}>{t}</h2><p style={{ margin: 0, color: 'var(--muted)' }}>{d}</p></div>
          </li>
        ))}
      </ol>
      <section className="free" aria-label="What it costs you">
        <span className="big">$0</span>
        <div>
          <h2>What it costs you: nothing</h2>
          <p>Searching, comparing, requesting quotes and messaging managers are all free for owners, with no card needed and no obligation to accept a quote.</p>
        </div>
      </section>
      <p className="hint" style={{ margin: 0 }}>How we stay free: owners never pay. Managers can pay for optional tools for their own business, and we may show clearly labelled partner offers, such as insurance or photography, on separate pages. None of it changes a rating, where a manager appears or how quotes are compared.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link className="btn primary" href="/">Compare managers near you</Link>
        <Link className="btn secondary" href="/rules">Check the rules in your state</Link>
      </div>
      </div>
    </main>
  );
}
