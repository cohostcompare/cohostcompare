import type { NearbyManager } from './types';

/*
 "Recommended" order (shared by search results, area pages, the top-3 button, owner follow-up emails and ranking pages).
 A blend, never anything a manager pays for:
 - 50% guest rating: near this address when they run 3+ homes here, else overall; pulled toward the list average
   by RATING_PRIOR reviews so a handful of perfect scores can't beat thousands of near-perfect ones.
 - 30% local experience: homes they run near this address (log scale, so 40 homes isn't 10x better than 4).
 - 10% on CoHostCompare: the manager has claimed their profile and replies to requests here (free; owners get answers).
 - 10% owner reviews on CoHostCompare, once a manager has any.
 Then one rule: hotel-style operators (FLAG_WORDS in the name, or an admin rank_flag) never take the top 3 places.
 They stay listed and can still be added to a quote.
*/
export const WEIGHTS = { rating: 0.5, local: 0.3, claimed: 0.1, ownerReviews: 0.1 } as const;
const RATING_PRIOR = 50;
export const TOP_PROTECTED = 3;
export const FLAG_WORDS = /\b(hotels?|hotelesque|resorts?|motels?|motor inn|hostels?|backpackers|aparthotels?|serviced apartments?)\b/i;

type M = Pick<NearbyManager, 'name' | 'claimed' | 'avgRating' | 'reviewCount' | 'nearby' | 'nearbyRating' | 'propertyCount'> & { rankFlag?: string | null; ownerReviews?: { avg: number; count: number } | null };

/** Why a manager is kept out of the top 3, or null. */
export function rankFlag(m: Pick<M, 'name' | 'rankFlag'>): string | null {
  if (m.rankFlag) return m.rankFlag;
  const w = m.name.match(FLAG_WORDS)?.[0];
  return w ? `Name says “${w.toLowerCase()}”` : null;
}

function rating(m: M): { r: number; n: number } | null {
  // Near this address when they run 3+ homes here; its weight is their reviews in proportion to the homes here.
  if (m.nearbyRating != null && (m.nearby || 0) >= 3) return { r: Number(m.nearbyRating), n: (Number(m.reviewCount) || 0) * Math.min(1, m.nearby / (Number(m.propertyCount) || m.nearby)) };
  if (m.avgRating != null) return { r: Number(m.avgRating), n: Number(m.reviewCount) || 0 };
  return null;
}

/** 0–1 scores for a list, comparable only within that list. */
export function recommendScores<T extends M>(list: T[], homes: (m: T) => number = (m) => m.nearby || 0): Map<T, number> {
  const rs = list.map(rating).filter(Boolean) as { r: number; n: number }[];
  const mean = rs.length ? rs.reduce((s, x) => s + x.r * Math.max(x.n, 1), 0) / rs.reduce((s, x) => s + Math.max(x.n, 1), 0) : 4.7;
  const maxHomes = Math.max(1, ...list.map(homes));
  const out = new Map<T, number>();
  for (const m of list) {
    const r = rating(m);
    const adj = r ? (r.r * r.n + mean * RATING_PRIOR) / (r.n + RATING_PRIOR) : null;
    const ratingPart = adj == null ? 0 : Math.min(1, Math.max(0, (adj - 4) / 1)); // 4.0★ → 0, 5.0★ → 1
    const localPart = Math.log1p(homes(m)) / Math.log1p(maxHomes);
    const ownerPart = m.ownerReviews?.count ? Math.min(1, Math.max(0, (m.ownerReviews.avg - 3) / 2)) * Math.min(1, m.ownerReviews.count / 3) : 0;
    out.set(m, WEIGHTS.rating * ratingPart + WEIGHTS.local * localPart + WEIGHTS.claimed * (m.claimed ? 1 : 0) + WEIGHTS.ownerReviews * ownerPart);
  }
  return out;
}

/** Keeps flagged managers out of the first TOP_PROTECTED places, otherwise leaves the order alone. */
export function protectTop<T extends Pick<M, 'name' | 'rankFlag'>>(ordered: T[]): T[] {
  const head: T[] = [], held: T[] = [];
  let i = 0;
  for (; i < ordered.length && head.length < TOP_PROTECTED; i++) (rankFlag(ordered[i]) ? held : head).push(ordered[i]);
  return [...head, ...held, ...ordered.slice(i)];
}

/** The recommended order: blended score (ties: more homes nearby, then original order), then the top-3 rule. */
export function recommended<T extends M>(list: T[]): T[] {
  const s = recommendScores(list);
  const sorted = list.map((m, i) => ({ m, i })).sort((a, b) => s.get(b.m)! - s.get(a.m)! || (b.m.nearby || 0) - (a.m.nearby || 0) || a.i - b.i).map((x) => x.m);
  return protectTop(sorted);
}
