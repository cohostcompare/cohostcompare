import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import AreaView, { placeManagers } from '@/components/AreaView';
import { managersNear } from '@/lib/data';
import { metaDescription } from '@/lib/seo';
import { kmBetween, liveSuburbs, MIN_INDEX, MIN_MANAGERS, suburb, suburbHref } from '@/lib/suburbs';

// Suburb landing pages for search and ads. See src/lib/suburbs.ts.
export const revalidate = 1800;
type P = Promise<{ slug: string }>;

// Rendered on first visit, then cached (revalidate): building ~50 of these at once, each reading coverage for every suburb,
// overloaded the database connection pool and timed builds out (Nov 2026).
export async function generateStaticParams() {
  return [] as { slug: string }[];
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const s = await suburb((await params).slug);
  if (!s || s.dupOf) return {};
  const long = `Airbnb management in ${s.name} ${s.state} ${s.postcode}`;
  return {
    title: long.length <= 44 ? long : `Airbnb managers in ${s.name}, ${s.state}`,
    description: metaDescription(`Compare Airbnb and short-term rental managers in ${s.name} ${s.postcode}: fees, guest ratings and homes they run nearby, side by side. Request up to five quotes free. No manager can pay to rank higher.`),
    alternates: { canonical: `/airbnb-management/${s.slug}` },
    // Fewer than MIN_INDEX managers: the page still works for visitors and ads, but isn't offered to search engines.
    ...((await managersNear(s.lat, s.lng).then((m) => m.length, () => MIN_INDEX)) < MIN_INDEX ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function SuburbPage({ params }: { params: P }) {
  const s = await suburb((await params).slug);
  if (!s) notFound();
  if (s.dupOf) permanentRedirect(suburbHref(s));
  const managers = await placeManagers(s.lat, s.lng);
  if (managers.length < MIN_MANAGERS) notFound();
  const all = await liveSuburbs();
  const nearby = all.filter((x) => x.slug !== s.slug && x.state === s.state).map((x) => ({ ...x, d: kmBetween(s, x) })).filter((x) => x.d <= 25).sort((x, y) => x.d - y.d).slice(0, 8);
  const crumbs: [string, string][] = s.area
    ? [['Home', '/'], ['Areas', '/areas'], [s.area.label, `/areas/${s.area.slug}`], [s.name, `/airbnb-management/${s.slug}`]]
    : [['Home', '/'], ['Areas', '/areas'], [s.name, `/airbnb-management/${s.slug}`]];
  return (
    <AreaView
      place={{ label: s.name, lat: s.lat, lng: s.lng, state: s.state === 'VIC' ? 'vic' : 'nsw', postcode: s.postcode }}
      managers={managers}
      crumbs={crumbs}
      back={s.area ? { href: `/areas/${s.area.slug}`, label: s.area.label } : { href: '/areas', label: 'All areas' }}
      nearby={nearby.map((x) => ({ href: suburbHref(x), label: x.name }))}
      nearbyTitle="Nearby suburbs"
      heading={`Airbnb and short-term rental managers in ${s.name}`}
      lead={<p className="lede" style={{ margin: '4px 0 8px' }}>Own a holiday home or apartment in {s.name} {s.postcode}? Compare the managers who already run homes here, then request quotes from up to five in one go. Free for owners.</p>}
    />
  );
}
