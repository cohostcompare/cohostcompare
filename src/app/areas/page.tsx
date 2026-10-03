import type { Metadata } from 'next';
import Link from 'next/link';
import CoverageMap from '@/components/CoverageMap';
import { areas } from '@/lib/areas';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Short-term rental managers by area',
  alternates: { canonical: '/areas' },
  description: 'Compare Airbnb and short-term rental managers by area: Sydney, Melbourne and holiday spots across NSW and Victoria, on a map.',
};

export default async function Areas() {
  const all = await areas();
  const cities = [...new Set(all.map((a) => a.city))];
  return (
    <main style={{ maxWidth: 900, paddingBlock: '16px 64px', display: 'grid', gap: 24 }}>
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', margin: 0 }}>Short-term rental managers by area</h1>
        <p className="lede">Pick an area to compare the managers running homes there, or <Link href="/">search your exact address</Link>. Sydney, Melbourne and holiday spots across NSW and Victoria, with more coming soon.</p>
      </header>
      <CoverageMap areas={all.map((a) => ({ slug: a.slug, label: a.label, city: a.city, lat: a.lat, lng: a.lng }))} compact hideList />
      {cities.map((c) => (
        <section key={c} style={{ display: 'grid', gap: 10 }}>
          <h2 style={{ fontSize: 24, margin: 0 }}>{c}</h2>
          <div className="chips">{all.filter((a) => a.city === c).map((a) => <Link key={a.slug} className="chip" href={`/areas/${a.slug}`} style={{ textDecoration: 'none', fontSize: 15, padding: '6px 12px' }}>{a.label}</Link>)}</div>
        </section>
      ))}
    </main>
  );
}
