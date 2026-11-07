import 'server-only';
import { unstable_cache } from 'next/cache';
import { areas, type Area } from '@/lib/areas';
import { managersNear } from '@/lib/data';
import type { NearbyManager } from '@/lib/types';
import { rankFlag, recommendScores } from '@/lib/recommend';

/*
 City ranking pages (/best-airbnb-managers/[slug]). Neutral and repeatable:
 - Who's in: published managers who run at least one home within 4 km of an area we cover in that city,
   with at least MIN_HOMES_HERE homes near one of its areas and a guest rating from at least MIN_REVIEWS public reviews.
 - Not hotel-style operators (rankFlag in recommend.ts): they're left out, never hidden.
 - Order: the "Recommended" blend from recommend.ts (rating adjusted for review count 50%, homes near one area here 30%,
   on CoHostCompare 10%, owner reviews 10%). Ties: more homes in the city first.
 - Nothing a manager pays for is used, and nothing is hand-edited.
*/
export const MIN_REVIEWS = 20;
/** A real presence in the city: at least this many homes near one of its areas. */
export const MIN_HOMES_HERE = 3;
export const TOP_N = 20;

export const RANK_CITIES = [
  { slug: 'sydney', city: 'Sydney', label: 'Sydney', short: 'Sydney', state: 'NSW' },
  { slug: 'melbourne', city: 'Melbourne', label: 'Melbourne', short: 'Melbourne', state: 'VIC' },
  { slug: 'regional-nsw', city: 'NSW holiday areas', label: 'regional NSW holiday areas', short: 'regional NSW', state: 'NSW' },
  { slug: 'regional-victoria', city: 'Victorian holiday areas', label: 'regional Victorian holiday areas', short: 'regional Victoria', state: 'VIC' },
] as const;
export type RankCity = (typeof RANK_CITIES)[number];

export type Ranked = {
  slug: string; name: string; score: number; rating: number; reviews: number;
  homesHere: number; areasHere: string[]; totalHomes: number | null;
  feeMin: number | null; feeMax: number | null; nightly: number | null; claimed: boolean; verified: boolean;
};
export type Ranking = { asOf: string; city: RankCity; covering: number; eligible: number; meanRating: number | null; list: Ranked[]; areas: { slug: string; label: string }[] };

async function build(slug: string): Promise<Ranking | null> {
  const city = RANK_CITIES.find((c) => c.slug === slug);
  if (!city) return null;
  const all = (await areas()).filter((a) => a.city === city.city);
  if (!all.length) return null;
  const per: { a: Area; ms: NearbyManager[] }[] = [];
  for (let i = 0; i < all.length; i += 6) per.push(...(await Promise.all(all.slice(i, i + 6).map(async (a) => ({ a, ms: await managersNear(a.lat, a.lng) })))));
  if (per.every((p) => !p.ms.length)) throw new Error('ranking figures incomplete'); // never cache an empty page
  // One row per manager: the most homes seen near any one area (areas overlap, so adding them up would double count).
  const by = new Map<string, { m: NearbyManager; homes: number; areas: Set<string> }>();
  for (const { a, ms } of per) for (const m of ms) {
    const r = by.get(m.id) || { m, homes: 0, areas: new Set<string>() };
    r.homes = Math.max(r.homes, m.nearby || 0); r.areas.add(a.label); by.set(m.id, r);
  }
  const rows = [...by.values()];
  // Hotel-style operators (name words or an admin flag) are left out of ranking pages entirely; their profiles stay up.
  const rated = rows.filter((r) => r.m.avgRating != null && (r.m.reviewCount || 0) >= MIN_REVIEWS && r.homes >= MIN_HOMES_HERE && !rankFlag(r.m));
  const mean = rated.length ? rated.reduce((s, r) => s + Number(r.m.avgRating) * Number(r.m.reviewCount), 0) / rated.reduce((s, r) => s + Number(r.m.reviewCount), 0) : null;
  // Same blend as "Recommended" in search results, at city level: overall rating, homes near one area here, on CoHostCompare.
  const cand = rated.map((r) => ({ r, name: r.m.name, claimed: r.m.claimed, avgRating: r.m.avgRating, reviewCount: r.m.reviewCount, nearby: r.homes, nearbyRating: null, propertyCount: r.m.propertyCount }));
  const scores = recommendScores(cand);
  const list = cand.map((c) => {
    const r = c.r;
    return {
      slug: r.m.slug, name: r.m.name, score: scores.get(c)!, rating: Number(r.m.avgRating), reviews: Number(r.m.reviewCount),
      homesHere: r.homes, areasHere: [...r.areas].sort(), totalHomes: r.m.propertyCount,
      feeMin: r.m.feeMin, feeMax: r.m.feeMax, nightly: r.m.avgNightlyRate ? Math.round(Number(r.m.avgNightlyRate)) : null,
      claimed: Boolean(r.m.claimed), verified: Boolean(r.m.verified),
    };
  }).sort((x, y) => y.score - x.score || y.homesHere - x.homesHere || x.name.localeCompare(y.name));
  return {
    asOf: new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date()), city, covering: rows.length, eligible: list.length,
    meanRating: mean == null ? null : Math.round(mean * 100) / 100, list: list.slice(0, TOP_N),
    areas: all.map((a) => ({ slug: a.slug, label: a.label })),
  };
}

const cached = unstable_cache(build, ['ranking-v3'], { revalidate: 6 * 3600 });
export async function ranking(slug: string) { return cached(slug); }
