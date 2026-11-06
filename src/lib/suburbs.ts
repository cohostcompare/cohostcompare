import 'server-only';
import { unstable_cache } from 'next/cache';
import { areas, type Area } from '@/lib/areas';
import { managersNear } from '@/lib/data';

/*
 Suburb landing pages (/airbnb-management/[slug]): one page per suburb owners actually search, inside or next to
 our live areas, for search traffic and as focused Google Ads landing pages. Each page shows the managers within
 COVER_KM of the suburb centre, so the list differs from the wider area page.
 A suburb that is really the same place as an area page (same name, centre within DUP_KM) isn't given its own
 page: its URL redirects to the area page, so we never publish two near-identical pages.
 Pages with fewer than MIN_MANAGERS managers nearby 404 and stay out of the sitemap (thin pages hurt SEO).
*/

export type SuburbDef = { name: string; state: 'NSW' | 'VIC'; postcode: string; lat: number; lng: number };
export type Suburb = SuburbDef & { slug: string; area: Area | null; dupOf: string | null };

export const MIN_MANAGERS = 3;
/** Pages with fewer managers than this still work (ads, links) but are noindex and out of the sitemap, so search engines only see substantial pages. */
export const MIN_INDEX = 5;
const DUP_KM = 1.5;

// Centres are approximate suburb centres; coverage uses a 4 km radius so a few hundred metres doesn't matter.
const LIST: SuburbDef[] = [
  // Sydney: eastern suburbs and beaches
  { name: 'Bondi Beach', state: 'NSW', postcode: '2026', lat: -33.8915, lng: 151.2767 },
  { name: 'Bronte', state: 'NSW', postcode: '2024', lat: -33.9036, lng: 151.2650 },
  { name: 'Tamarama', state: 'NSW', postcode: '2026', lat: -33.8990, lng: 151.2700 },
  { name: 'Clovelly', state: 'NSW', postcode: '2031', lat: -33.9130, lng: 151.2620 },
  { name: 'Coogee', state: 'NSW', postcode: '2034', lat: -33.9200, lng: 151.2550 },
  { name: 'Randwick', state: 'NSW', postcode: '2031', lat: -33.9140, lng: 151.2410 },
  { name: 'Bondi Junction', state: 'NSW', postcode: '2022', lat: -33.8920, lng: 151.2480 },
  { name: 'Double Bay', state: 'NSW', postcode: '2028', lat: -33.8780, lng: 151.2430 },
  { name: 'Rose Bay', state: 'NSW', postcode: '2029', lat: -33.8700, lng: 151.2690 },
  { name: 'Vaucluse', state: 'NSW', postcode: '2030', lat: -33.8580, lng: 151.2780 },
  { name: 'Watsons Bay', state: 'NSW', postcode: '2030', lat: -33.8440, lng: 151.2820 },
  { name: 'Paddington', state: 'NSW', postcode: '2021', lat: -33.8840, lng: 151.2270 },
  // Sydney: inner city
  { name: 'Surry Hills', state: 'NSW', postcode: '2010', lat: -33.8860, lng: 151.2110 },
  { name: 'Darlinghurst', state: 'NSW', postcode: '2010', lat: -33.8790, lng: 151.2190 },
  { name: 'Potts Point', state: 'NSW', postcode: '2011', lat: -33.8700, lng: 151.2250 },
  { name: 'Pyrmont', state: 'NSW', postcode: '2009', lat: -33.8700, lng: 151.1940 },
  { name: 'Glebe', state: 'NSW', postcode: '2037', lat: -33.8790, lng: 151.1850 },
  { name: 'The Rocks', state: 'NSW', postcode: '2000', lat: -33.8590, lng: 151.2080 },
  { name: 'Balmain', state: 'NSW', postcode: '2041', lat: -33.8580, lng: 151.1790 },
  { name: 'Rozelle', state: 'NSW', postcode: '2039', lat: -33.8620, lng: 151.1710 },
  // Sydney: north shore and northern beaches
  { name: 'Neutral Bay', state: 'NSW', postcode: '2089', lat: -33.8370, lng: 151.2190 },
  { name: 'North Sydney', state: 'NSW', postcode: '2060', lat: -33.8390, lng: 151.2070 },
  { name: 'Freshwater', state: 'NSW', postcode: '2096', lat: -33.7790, lng: 151.2880 },
  { name: 'Dee Why', state: 'NSW', postcode: '2099', lat: -33.7520, lng: 151.2860 },
  { name: 'Collaroy', state: 'NSW', postcode: '2097', lat: -33.7320, lng: 151.3010 },
  { name: 'Newport', state: 'NSW', postcode: '2106', lat: -33.6560, lng: 151.3180 },
  { name: 'Avalon Beach', state: 'NSW', postcode: '2107', lat: -33.6360, lng: 151.3290 },
  { name: 'Whale Beach', state: 'NSW', postcode: '2107', lat: -33.6110, lng: 151.3300 },
  { name: 'Palm Beach', state: 'NSW', postcode: '2108', lat: -33.5990, lng: 151.3240 },
  // NSW holiday towns
  { name: 'Suffolk Park', state: 'NSW', postcode: '2481', lat: -28.6900, lng: 153.6100 },
  { name: 'Bangalow', state: 'NSW', postcode: '2479', lat: -28.6870, lng: 153.5240 },
  { name: 'Lennox Head', state: 'NSW', postcode: '2478', lat: -28.7930, lng: 153.5930 },
  { name: 'Ballina', state: 'NSW', postcode: '2478', lat: -28.8670, lng: 153.5650 },
  { name: 'Nelson Bay', state: 'NSW', postcode: '2315', lat: -32.7190, lng: 152.1440 },
  { name: 'Shoal Bay', state: 'NSW', postcode: '2315', lat: -32.7230, lng: 152.1750 },
  { name: 'Terrigal', state: 'NSW', postcode: '2260', lat: -33.4480, lng: 151.4450 },
  { name: 'Avoca Beach', state: 'NSW', postcode: '2251', lat: -33.4680, lng: 151.4330 },
  { name: 'Copacabana', state: 'NSW', postcode: '2251', lat: -33.4880, lng: 151.4350 },
  { name: 'Pokolbin', state: 'NSW', postcode: '2320', lat: -32.7700, lng: 151.2900 },
  { name: 'Katoomba', state: 'NSW', postcode: '2780', lat: -33.7140, lng: 150.3120 },
  { name: 'Leura', state: 'NSW', postcode: '2780', lat: -33.7170, lng: 150.3310 },
  { name: 'Wentworth Falls', state: 'NSW', postcode: '2782', lat: -33.7090, lng: 150.3760 },
  { name: 'Blackheath', state: 'NSW', postcode: '2785', lat: -33.6350, lng: 150.2850 },
  { name: 'Gerringong', state: 'NSW', postcode: '2534', lat: -34.7460, lng: 150.8280 },
  { name: 'Huskisson', state: 'NSW', postcode: '2540', lat: -35.0390, lng: 150.6720 },
  { name: 'Vincentia', state: 'NSW', postcode: '2540', lat: -35.0700, lng: 150.6750 },
  { name: 'Hyams Beach', state: 'NSW', postcode: '2540', lat: -35.1020, lng: 150.6900 },
  { name: 'Callala Beach', state: 'NSW', postcode: '2540', lat: -35.0090, lng: 150.6960 },
  { name: 'Mollymook', state: 'NSW', postcode: '2539', lat: -35.3300, lng: 150.4720 },
  { name: 'Ulladulla', state: 'NSW', postcode: '2539', lat: -35.3580, lng: 150.4720 },
  // Melbourne
  { name: 'Southbank', state: 'VIC', postcode: '3006', lat: -37.8230, lng: 144.9640 },
  { name: 'South Yarra', state: 'VIC', postcode: '3141', lat: -37.8380, lng: 144.9930 },
  { name: 'Richmond', state: 'VIC', postcode: '3121', lat: -37.8230, lng: 144.9980 },
  { name: 'Prahran', state: 'VIC', postcode: '3181', lat: -37.8510, lng: 144.9930 },
  { name: 'Windsor', state: 'VIC', postcode: '3181', lat: -37.8560, lng: 144.9920 },
  { name: 'Fitzroy', state: 'VIC', postcode: '3065', lat: -37.7990, lng: 144.9780 },
  { name: 'Collingwood', state: 'VIC', postcode: '3066', lat: -37.8020, lng: 144.9880 },
  { name: 'Carlton', state: 'VIC', postcode: '3053', lat: -37.8000, lng: 144.9670 },
  { name: 'Brunswick', state: 'VIC', postcode: '3056', lat: -37.7670, lng: 144.9620 },
  { name: 'South Melbourne', state: 'VIC', postcode: '3205', lat: -37.8330, lng: 144.9580 },
  { name: 'Port Melbourne', state: 'VIC', postcode: '3207', lat: -37.8390, lng: 144.9420 },
  { name: 'Albert Park', state: 'VIC', postcode: '3206', lat: -37.8410, lng: 144.9550 },
  { name: 'Elwood', state: 'VIC', postcode: '3184', lat: -37.8820, lng: 144.9850 },
  { name: 'Brighton', state: 'VIC', postcode: '3186', lat: -37.9070, lng: 144.9990 },
  // Victorian holiday towns
  { name: 'Sorrento', state: 'VIC', postcode: '3943', lat: -38.3390, lng: 144.7410 },
  { name: 'Portsea', state: 'VIC', postcode: '3944', lat: -38.3200, lng: 144.7110 },
  { name: 'Rye', state: 'VIC', postcode: '3941', lat: -38.3770, lng: 144.8250 },
  { name: 'Rosebud', state: 'VIC', postcode: '3939', lat: -38.3570, lng: 144.9060 },
  { name: 'Mount Martha', state: 'VIC', postcode: '3934', lat: -38.2660, lng: 145.0150 },
  { name: 'Cowes', state: 'VIC', postcode: '3922', lat: -38.4520, lng: 145.2390 },
  { name: 'Torquay', state: 'VIC', postcode: '3228', lat: -38.3310, lng: 144.3260 },
  { name: 'Anglesea', state: 'VIC', postcode: '3230', lat: -38.4070, lng: 144.1860 },
  { name: 'Aireys Inlet', state: 'VIC', postcode: '3231', lat: -38.4630, lng: 144.1040 },
  { name: 'Ocean Grove', state: 'VIC', postcode: '3226', lat: -38.2610, lng: 144.5200 },
  { name: 'Barwon Heads', state: 'VIC', postcode: '3227', lat: -38.2790, lng: 144.4900 },
  { name: 'Queenscliff', state: 'VIC', postcode: '3225', lat: -38.2680, lng: 144.6600 },
  { name: 'Point Lonsdale', state: 'VIC', postcode: '3225', lat: -38.2860, lng: 144.6130 },
  { name: 'Healesville', state: 'VIC', postcode: '3777', lat: -37.6540, lng: 145.5150 },
];

export const kmBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (d: number) => (d * Math.PI) / 180;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2));
};

export const suburbSlug = (s: Pick<SuburbDef, 'name' | 'state'>) => `${s.name}-${s.state}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Every suburb with its nearest live area, and the area page it duplicates (if any). */
export async function suburbs(): Promise<Suburb[]> {
  const all = await areas();
  return LIST.map((s) => {
    const ranked = all.map((a) => ({ a, d: kmBetween(s, a) })).sort((x, y) => x.d - y.d);
    const near = ranked[0];
    const first = (s.name.split(' ')[0] || '').toLowerCase();
    const dup = ranked.find(({ a, d }) => {
      if (d > DUP_KM) return false;
      const lead = a.label.split(/\s*[/(]\s*/)[0].trim().toLowerCase();
      const paren = (a.label.match(/\(([^)]*)\)/)?.[1] || '').toLowerCase();
      return lead.startsWith(first) || paren.includes(s.name.toLowerCase());
    });
    return { ...s, slug: suburbSlug(s), area: near && near.d <= 15 ? near.a : null, dupOf: dup ? dup.a.slug : null };
  });
}

export async function suburb(slug: string) {
  return (await suburbs()).find((s) => s.slug === slug) || null;
}

/** Suburbs that get their own page (not duplicates of an area page). Manager counts are checked on the page. */
export async function suburbPages() {
  return (await suburbs()).filter((s) => !s.dupOf);
}

/** Manager counts per suburb page, cached for 6 hours (one coverage lookup per suburb). */
const counts = unstable_cache(async () => {
  const subs = await suburbPages();
  const n = await Promise.all(subs.map((s) => managersNear(s.lat, s.lng).then((m) => m.length, () => 0)));
  return Object.fromEntries(subs.map((s, i) => [s.slug, n[i]])) as Record<string, number>;
}, ['suburb-counts-v1'], { revalidate: 6 * 3600 });

/** Suburbs worth linking to: duplicates (they point at their area page) plus own pages with enough managers. */
export async function liveSuburbs() {
  const [all, n] = await Promise.all([suburbs(), counts()]);
  return all.filter((s) => s.dupOf || (n[s.slug] ?? 0) >= MIN_MANAGERS);
}

/** Own suburb pages with enough managers to be indexed (sitemap, IndexNow). */
export async function indexableSuburbs() {
  const [all, n] = await Promise.all([suburbPages(), counts()]);
  return all.filter((s) => (n[s.slug] ?? 0) >= MIN_INDEX);
}
export async function suburbManagerCount(slug: string) { return (await counts())[slug] ?? 0; }

/** Where a suburb lives on the site: its own page, or the area page it duplicates. */
export const suburbHref = (s: Pick<Suburb, 'slug' | 'dupOf'>) => (s.dupOf ? `/areas/${s.dupOf}` : `/airbnb-management/${s.slug}`);
