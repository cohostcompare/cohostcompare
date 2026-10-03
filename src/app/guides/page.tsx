import type { Metadata } from 'next';
import Link from 'next/link';
import GuideSignup from '@/components/GuideSignup';
import JsonLd from '@/components/JsonLd';
import { GUIDES } from '@/lib/guides';
import { RULES } from '@/lib/rules';
import { breadcrumbs, itemList } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Guides for short-term rental owners',
  description: 'Plain-English guides for Australian owners: Airbnb management fees, co-host or full-service manager, how to choose a manager, and the short-stay rules by state.',
  alternates: { canonical: '/guides' },
};

export default function Guides() {
  return (
    <main style={{ maxWidth: 900, paddingBlock: '16px 64px', display: 'grid', gap: 24 }}>
      <JsonLd data={[breadcrumbs([['Home', '/'], ['Guides', '/guides']]), itemList('Guides for short-term rental owners', GUIDES.map((g) => ({ name: g.title, path: `/guides/${g.slug}` })))]} />
      <header style={{ display: 'grid', gap: 8 }}>
        <span className="label" style={{ color: 'var(--brand)' }}>Guides</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', margin: 0 }}>Guides for short-term rental owners</h1>
        <p className="lede">What managers charge, how to choose one, and the rules where your property is. Fee figures update from the managers we list.</p>
      </header>
      <div className="guide-cards">
        {GUIDES.map((g) => (
          <Link key={g.slug} href={`/guides/${g.slug}`} className="panel guide-card">
            <b>{g.short}</b>
            <span>{g.description}</span>
            <span className="more">Read the guide →</span>
          </Link>
        ))}
      </div>
      <GuideSignup />
      <section style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>Short-stay rules by state</h2>
        <div className="chips">{RULES.map((r) => <Link key={r.code} className="chip" href={`/rules/${r.code}`}>{r.name}</Link>)}</div>
      </section>
    </main>
  );
}
