import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { RANK_CITIES } from '@/lib/rankings';
import { breadcrumbs } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Best Airbnb managers in Australia, by city',
  description: 'Rankings of the top Airbnb and short-term rental managers in Sydney, Melbourne and regional NSW and Victoria, on guest ratings, local homes and responsiveness. No paid placements.',
  alternates: { canonical: '/best-airbnb-managers' },
};

export default function Rankings() {
  return (
    <main style={{ maxWidth: 820, paddingBlock: '16px 64px', display: 'grid', gap: 18 }}>
      <JsonLd data={breadcrumbs([['Home', '/'], ['Best Airbnb managers', '/best-airbnb-managers']])} />
      <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', margin: 0 }}>Best Airbnb managers, by city</h1>
      <p className="lede" style={{ margin: 0 }}>Each list ranks managers on a blend of public guest ratings (adjusted for how many reviews they have), homes they run locally and whether they reply to owners here. No manager can pay to appear or move up, and the lists rebuild automatically.</p>
      <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8, fontSize: 18 }}>
        {RANK_CITIES.map((c) => <li key={c.slug}><Link href={`/best-airbnb-managers/${c.slug}`}>Best Airbnb managers in {c.label}</Link></li>)}
      </ul>
      <p style={{ margin: 0 }}>Looking for a specific suburb? <Link href="/">Search your address</Link> to see every manager within 4 km of your property, or browse <Link href="/areas">all areas</Link>.</p>
    </main>
  );
}
