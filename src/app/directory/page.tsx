import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { feeLabel } from '@/lib/data';
import { breadcrumbs, itemList } from '@/lib/seo';
import { adminClient } from '@/lib/supabase/server';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'All short-term rental managers, A to Z',
  description: 'Every Airbnb and short-term rental manager on CoHostCompare, grouped by the cities and regions they cover across NSW and Victoria. Compare fees and guest ratings, then request quotes.',
  alternates: { canonical: '/directory' },
};

type Row = { slug: string; name: string; cities: string[] | null; fee_min: number | null; fee_max: number | null; claimed: boolean };

/** Every published profile, so each one is reachable from a page (not just the sitemap). */
export default async function Directory() {
  const { data, error } = await adminClient().from('managers').select('slug, name, cities, fee_min, fee_max, claimed').eq('published', true).order('name');
  if (error && process.env.VERCEL) throw new Error(`directory: ${error.message}`); // never cache an empty list
  const rows = (data || []) as Row[];
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const keys = r.cities?.length ? r.cities.slice(0, 2) : ['Other areas'];
    for (const k of keys) groups.set(k, [...(groups.get(k) || []), r]);
  }
  const order = [...groups.keys()].sort((a, b) => (groups.get(b)!.length - groups.get(a)!.length) || a.localeCompare(b));
  return (
    <main style={{ maxWidth: 1000, paddingBlock: '16px 64px', display: 'grid', gap: 22 }}>
      <JsonLd data={[breadcrumbs([['Home', '/'], ['All managers', '/directory']]), itemList('Short-term rental managers on CoHostCompare', rows.slice(0, 200).map((r) => ({ name: r.name, path: `/managers/${r.slug}` })))]} />
      <header style={{ display: 'grid', gap: 8 }}>
        <span className="label" style={{ color: 'var(--brand)' }}>Directory</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', margin: 0 }}>All short-term rental managers</h1>
        <p className="lede">{rows.length} managers and co-hosts across NSW and Victoria, grouped by where they work. For the ones covering your exact address, <Link href="/">search your address</Link>.</p>
      </header>
      <nav aria-label="Jump to a city or region" className="chips">
        {order.map((k) => <a key={k} className="chip" href={`#${k.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{k} ({groups.get(k)!.length})</a>)}
      </nav>
      {order.map((k) => (
        <section key={k} id={k.toLowerCase().replace(/[^a-z0-9]+/g, '-')} style={{ display: 'grid', gap: 8, scrollMarginTop: 96 }}>
          <h2 style={{ fontSize: 22, margin: 0 }}>{k}</h2>
          <ul className="dir-list">
            {groups.get(k)!.map((r) => {
              const fee = feeLabel({ feeMin: r.fee_min, feeMax: r.fee_max });
              return <li key={r.slug}><Link href={`/managers/${r.slug}`}>{r.name}</Link>{fee ? <span className="hint"> · {fee} fee</span> : null}{r.claimed ? <span className="hint"> · claimed</span> : null}</li>;
            })}
          </ul>
        </section>
      ))}
      <p className="hint" style={{ margin: 0 }}>Profiles are built from public information and each manager&apos;s own website; managers can claim and correct theirs. No manager can pay to appear here or to rank higher.</p>
    </main>
  );
}
