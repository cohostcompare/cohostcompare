import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ResultsList from '@/components/ResultsList';
import { area } from '@/lib/areas';
import { COVER_KM, managersNear } from '@/lib/data';

export const dynamic = 'force-dynamic';
type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const a = await area((await params).slug);
  if (!a) return {};
  return {
    title: `Airbnb and short-term rental managers in ${a.label}`,
    description: `Compare short-term rental managers running homes in ${a.label}, ${a.city}: fees, guest ratings and homes managed nearby, side by side. Request up to five quotes free.`,
    alternates: { canonical: `/areas/${(await params).slug}` },
  };
}

export default async function AreaPage({ params }: { params: P }) {
  const a = await area((await params).slug);
  if (!a) notFound();
  const managers = await managersNear(a.lat, a.lng);
  const q = new URLSearchParams({ lat: String(a.lat), lng: String(a.lng), suburb: a.label });
  return (
    <main>
      <div className="results-head">
        <div>
          <Link href="/areas" className="hint">← All areas</Link>
          <h1>Short-term rental managers in {a.label}</h1>
          <span className="hint">{managers.length} manager{managers.length === 1 ? '' : 's'} running homes within {COVER_KM} km of central {a.label}, {a.city}, most active nearby first. For results around your exact address, <Link href="/">search your address</Link>.</span>
        </div>
      </div>
      {managers.length ? <ResultsList managers={managers} query={q.toString()} /> : <p className="panel">We haven&apos;t mapped managers here yet. <Link href="/">Search your address</Link>.</p>}
      <p className="hint" style={{ margin: '0 0 24px' }}>Ratings, home counts and occupancy are estimates based on managers&apos; public listings over the last 12 months. Data source: AirROI (<a href="https://www.airroi.com">www.airroi.com</a>).</p>
    </main>
  );
}
