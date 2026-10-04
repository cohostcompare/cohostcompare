import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DataSource from '@/components/DataSource';
import GuideSignup from '@/components/GuideSignup';
import JsonLd from '@/components/JsonLd';
import { GUIDES, guide } from '@/lib/guides';
import { fmtDate, market } from '@/lib/market';
import { article, breadcrumbs, faqPage, metaDescription } from '@/lib/seo';

export const revalidate = 3600;
type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const g = guide((await params).slug);
  if (!g) return {};
  return { title: { absolute: g.title }, description: metaDescription(g.description), alternates: { canonical: `/guides/${g.slug}` }, openGraph: { type: 'article', title: g.title, description: g.description, url: `/guides/${g.slug}` } };
}

export default async function GuidePage({ params }: { params: P }) {
  const g = guide((await params).slug);
  if (!g) notFound();
  const m = await market();
  const path = `/guides/${g.slug}`;
  const usesData = g.slug !== 'short-stay-rules-nsw';
  return (
    <main style={{ maxWidth: 780, paddingBlock: '16px 64px', display: 'grid', gap: 20 }}>
      <JsonLd data={[breadcrumbs([['Home', '/'], ['Guides', '/guides'], [g.short, path]]), article({ title: g.title, description: g.description, path, published: g.published, modified: usesData ? m.asOf : g.modified }), faqPage(g.faqs)]} />
      <nav className="hint" aria-label="Breadcrumb"><Link href="/guides">Guides</Link> › {g.short}</nav>
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ fontSize: 'clamp(28px,4.6vw,42px)', margin: 0 }}>{g.title}</h1>
        <span className="hint">By CoHostCompare · updated {fmtDate(usesData ? m.asOf : g.modified)}</span>
      </header>
      <article className="prose">{g.body(m)}</article>
      <section className="panel" style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>Common questions</h2>
        {g.faqs.map(([q, a]) => (
          <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>
        ))}
      </section>
      <section className="panel" style={{ background: 'var(--tint)', display: 'grid', gap: 10, justifyItems: 'start' }}>
        <b style={{ fontSize: 20 }}>Compare the managers who cover your address</b>
        <span>Fees, guest ratings and homes they run nearby, side by side. Request up to five quotes, free.</span>
        <Link className="btn primary" href="/">Search your address</Link>
      </section>
 <GuideSignup compact />
      <nav aria-label="More guides" style={{ display: 'grid', gap: 8 }}>
        <b>More guides</b>
        <div className="chips">{GUIDES.filter((x) => x.slug !== g.slug).map((x) => <Link key={x.slug} className="chip" href={`/guides/${x.slug}`}>{x.short}</Link>)}</div>
      </nav>
      {usesData && <DataSource />}
    </main>
  );
}
