import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AreaView, { placeManagers } from '@/components/AreaView';
import { area, areas } from '@/lib/areas';
import { kmBetween, liveSuburbs, suburbHref } from '@/lib/suburbs';

export const revalidate = 1800; // cached half an hour; figures move slowly
type P = Promise<{ slug: string }>;

const stateOf = (city: string) => (/melbourne|victoria/i.test(city) ? 'vic' : 'nsw') as 'nsw' | 'vic';

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const a = await area((await params).slug);
  if (!a) return {};
  return {
    title: `Airbnb and short-term rental managers in ${a.label}`,
    description: `Compare short-term rental managers running homes in ${a.label}: fees, guest ratings and homes managed nearby, side by side, plus the local short-stay rules. Request up to five quotes free.`,
    alternates: { canonical: `/areas/${(await params).slug}` },
  };
}

export default async function AreaPage({ params }: { params: P }) {
  const a = await area((await params).slug);
  if (!a) notFound();
  const [managers, all, subs] = await Promise.all([placeManagers(a.lat, a.lng), areas(), liveSuburbs()]);
  const nearby = all.filter((x) => x.slug !== a.slug && x.city === a.city).map((x) => ({ ...x, d: kmBetween(a, x) })).sort((x, y) => x.d - y.d).slice(0, 6);
  const inArea = subs.filter((s) => s.area?.slug === a.slug && !s.dupOf).map((s) => ({ href: suburbHref(s), label: s.name }));
  return (
    <AreaView
      place={{ label: a.label, lat: a.lat, lng: a.lng, state: stateOf(a.city) }}
      managers={managers}
      crumbs={[['Home', '/'], ['Areas', '/areas'], [a.label, `/areas/${a.slug}`]]}
      back={{ href: '/areas', label: 'All areas' }}
      nearby={nearby.map((x) => ({ href: `/areas/${x.slug}`, label: x.label }))}
      related={inArea}
      relatedTitle={`Suburbs in and around ${a.label}`}
    />
  );
}
