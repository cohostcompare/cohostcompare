import 'server-only';
import { unstable_cache } from 'next/cache';
import { areas, type Area } from '@/lib/areas';
import { managersNear } from '@/lib/data';
import type { NearbyManager } from '@/lib/types';
import { adminClient } from '@/lib/supabase/server';

/*
 Public market figures for guides, area pages, /facts and llms.txt.
 Only figures we already show publicly on area pages: manager counts, published management fees,
 homes managed nearby, typical nightly rate and guest rating. Revenue and occupancy stay in paid reports.
*/

export const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); if (!s.length) return null; const i = Math.floor(s.length / 2); return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2; };
const round1 = (x: number | null) => (x == null ? null : Math.round(x * 10) / 10);

export type FeeStats = { mid: number | null; low: number | null; high: number | null; count: number };

/** Fee figures from managers who publish a fee (mid-point of each manager's range). */
export function feeStats(ms: Pick<NearbyManager, 'feeMin' | 'feeMax'>[]): FeeStats {
  const f = ms.filter((m) => m.feeMin != null);
  const mids = f.map((m) => (Number(m.feeMin) + Number(m.feeMax ?? m.feeMin)) / 2);
  return {
    mid: round1(median(mids)),
    low: f.length ? round1(Math.min(...f.map((m) => Number(m.feeMin)))) : null,
    high: f.length ? round1(Math.max(...f.map((m) => Number(m.feeMax ?? m.feeMin)))) : null,
    count: f.length,
  };
}

export type AreaSnapshot = {
  slug: string; label: string; city: string; state: 'nsw' | 'vic';
  managers: number; homes: number; fee: FeeStats; rating: number | null; nightly: number | null;
};

export function snapshot(a: Area, ms: NearbyManager[]): AreaSnapshot {
  const rated = ms.filter((m) => m.nearbyRating && m.nearby);
  const w = rated.reduce((s, m) => s + m.nearby, 0);
  return {
    slug: a.slug, label: a.label, city: a.city, state: /^(mel|vic)-/.test(a.id) ? 'vic' : 'nsw',
    managers: ms.length,
    homes: ms.reduce((s, m) => s + (m.nearby || 0), 0),
    fee: feeStats(ms),
    rating: w ? Math.round((rated.reduce((s, m) => s + Number(m.nearbyRating) * m.nearby, 0) / w) * 100) / 100 : null,
    nightly: (() => { const n = median(ms.map((m) => Number(m.avgNightlyRate)).filter((x) => x > 0)); return n == null ? null : Math.round(n); })(),
  };
}

export type CityStats = { city: string; areas: number; managers: number; fee: FeeStats; nightly: number | null };
export type Market = {
  asOf: string; // ISO date the figures were worked out
  dataAsOf: string | null; // latest listing-data date
  managers: number; publishFees: number; claimed: number; areas: number;
  fee: FeeStats;
  cities: CityStats[];
  areaList: AreaSnapshot[];
};

async function build(): Promise<Market> {
  const all = await areas();
  const per: { a: Area; ms: NearbyManager[] }[] = [];
  for (let i = 0; i < all.length; i += 6) {
    const chunk = all.slice(i, i + 6);
    per.push(...(await Promise.all(chunk.map(async (a) => ({ a, ms: await managersNear(a.lat, a.lng) })))));
  }
  // Don't cache a bad run: if the areas or listing figures didn't load, throw so the pages fall back and retry next time.
  if (!all.length || per.every((p) => !p.ms.length)) throw new Error('market figures incomplete');
  const db = adminClient();
  const [{ data: mgrs, error: mErr }, { data: st }] = await Promise.all([
    db.from('managers').select('id, fee_min, fee_max, claimed').eq('published', true),
    db.from('manager_stats').select('data_as_of').order('data_as_of', { ascending: false }).limit(1),
  ]);
  if (mErr || !mgrs?.length) throw new Error('managers query failed');
  const list = (mgrs || []) as { id: string; fee_min: number | null; fee_max: number | null; claimed: boolean }[];
  const cityNames = [...new Set(all.map((a) => a.city))];
  const cities = cityNames.map((city) => {
    const rows = per.filter((p) => p.a.city === city);
    const uniq = new Map<string, NearbyManager>();
    rows.forEach((r) => r.ms.forEach((m) => uniq.set(m.id, m)));
    const ms = [...uniq.values()];
    return { city, areas: rows.length, managers: ms.length, fee: feeStats(ms), nightly: (() => { const n = median(rows.map((r) => snapshot(r.a, r.ms).nightly).filter((x): x is number => x != null)); return n == null ? null : Math.round(n); })() };
  });
  return {
    asOf: new Date().toISOString().slice(0, 10),
    dataAsOf: (st?.[0]?.data_as_of as string | undefined)?.slice(0, 10) || null,
    managers: list.length,
    publishFees: list.filter((m) => m.fee_min != null).length,
    claimed: list.filter((m) => m.claimed).length,
    areas: all.length,
    fee: feeStats(list.map((m) => ({ feeMin: m.fee_min, feeMax: m.fee_max }))),
    cities,
    areaList: per.map((p) => snapshot(p.a, p.ms)),
  };
}

/** Cached for 6 hours; the figures move slowly. */
const cachedMarket = unstable_cache(build, ['market-v1'], { revalidate: 6 * 3600 });
const EMPTY_FEE: FeeStats = { mid: null, low: null, high: null, count: 0 };
/** Never throws: pages still render (without figures) if the database is unreachable. */
export async function market(): Promise<Market> {
  try { return await cachedMarket(); } catch (e) {
    console.error('market figures failed', e);
    return { asOf: new Date().toISOString().slice(0, 10), dataAsOf: null, managers: 0, publishFees: 0, claimed: 0, areas: 0, fee: EMPTY_FEE, cities: [], areaList: [] };
  }
}

export const fmtDate = (iso: string) => new Date(`${iso}T00:00:00+10:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' });
export const pct = (x: number | null) => (x == null ? 'n/a' : `${x}%`);
export const feeRange = (f: FeeStats) => (f.low == null ? null : f.low === f.high ? `${f.low}%` : `${f.low}% to ${f.high}%`);
