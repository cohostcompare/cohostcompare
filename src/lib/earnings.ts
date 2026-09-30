import 'server-only';
import { unstable_cache } from 'next/cache';
import { adminClient } from '@/lib/supabase/server';

/*
 Earnings estimate for an address:
 - AirROI market lookup (US$0.01) + market summary (US$0.10), cached in market_cache for 30 days per market.
 - A bedroom adjustment from the listings we already store (free).
 - A daily cap on new AirROI calls so costs can't run away.
*/

const TTL_DAYS = 30;
const DAILY_NEW_MARKETS = 40; // at most ~US$4.40 a day on new lookups
const AIRROI = 'https://api.airroi.com';

export type Estimate = {
  market: string;
  low: number; mid: number; high: number; // A$ a year, gross booking revenue
  occupancy: number; // 0-1
  nightly: number; // A$
  activeListings: number | null;
  bedrooms: number;
  factor: number;
};

type Market = { full_name?: string; country?: string; region?: string; locality?: string; district?: string };
type Summary = { occupancy?: number; average_daily_rate?: number; revenue?: number; active_listings_count?: number };

async function cached<T>(key: string): Promise<T | null> {
  const { data } = await adminClient().from('market_cache').select('data, fetched_at').eq('key', key).maybeSingle();
  if (!data) return null;
  if (Date.now() - new Date(data.fetched_at).getTime() > TTL_DAYS * 86400e3) return null;
  return data.data as T;
}
async function store(key: string, data: unknown) {
  await adminClient().from('market_cache').upsert({ key, data, fetched_at: new Date().toISOString() });
}
async function underDailyCap() {
  const since = new Date(Date.now() - 86400e3).toISOString();
  const { count } = await adminClient().from('market_cache').select('key', { count: 'exact', head: true }).like('key', 'mk:%').gte('fetched_at', since);
  return (count ?? 0) < DAILY_NEW_MARKETS;
}
async function airroi(path: string, init?: RequestInit) {
  const r = await fetch(`${AIRROI}${path}`, { ...init, headers: { 'x-api-key': (process.env.AIRROI_API_KEY || '').trim(), 'Content-Type': 'application/json', ...(init?.headers || {}) }, cache: 'no-store' });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`AirROI ${r.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}

async function marketFor(lat: number, lng: number): Promise<Market | null> {
  const key = `pt:${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = await cached<Market>(key);
  if (hit) return hit;
  if (!(await underDailyCap())) return null;
  const m = (await airroi(`/markets/lookup?lat=${lat}&lng=${lng}`)) as Market | null;
  if (!m?.country) return null;
  await store(key, m);
  return m;
}

async function summaryFor(m: Market): Promise<Summary | null> {
  const name = m.full_name || [m.district, m.locality, m.region, m.country].filter(Boolean).join(', ');
  const key = `mk:${name}`;
  const hit = await cached<Summary>(key);
  if (hit) return hit;
  if (!(await underDailyCap())) return null;
  const market = Object.fromEntries(Object.entries({ country: m.country, region: m.region, locality: m.locality, district: m.district }).filter(([, v]) => v));
  const s = (await airroi('/markets/summary', { method: 'POST', body: JSON.stringify({ market, num_months: 12, currency: 'native' }) })) as Summary | null;
  if (!s) return null;
  await store(key, s);
  return s;
}

/** Revenue by bedrooms relative to the typical home, from the listings we already hold. */
const bedroomFactors = unstable_cache(async () => {
  const db = adminClient();
  const rows: { bedrooms: number | null; ttm_revenue: number | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from('str_listings').select('bedrooms, ttm_revenue').gt('ttm_revenue', 0).range(from, from + 999);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const all = median(rows.map((r) => Number(r.ttm_revenue)));
  const out: Record<number, number> = {};
  for (let b = 0; b <= 5; b++) {
    const xs = rows.filter((r) => (b === 5 ? (r.bedrooms ?? 0) >= 5 : r.bedrooms === b)).map((r) => Number(r.ttm_revenue));
    if (xs.length >= 20 && all) out[b] = Math.min(2.2, Math.max(0.55, median(xs) / all));
  }
  return out;
}, ['bedroom-factors'], { revalidate: 86400 });

const DEFAULT_FACTORS: Record<number, number> = { 0: 0.65, 1: 0.8, 2: 1, 3: 1.3, 4: 1.6, 5: 1.9 };

export async function estimateEarnings(lat: number, lng: number, bedrooms: number): Promise<Estimate | { error: string }> {
  try {
    const m = await marketFor(lat, lng);
    if (!m) return { error: 'We can’t estimate this area right now. Try again tomorrow.' };
    if (m.country && !/australia/i.test(m.country)) return { error: 'Estimates are available for Australian addresses only.' };
    const s = await summaryFor(m);
    const occ = Number(s?.occupancy), adr = Number(s?.average_daily_rate);
    if (!s || !(occ > 0) || !(adr > 0)) return { error: 'There isn’t enough short-stay data for this area to estimate earnings.' };
    const occupancy = occ > 1 ? occ / 100 : occ;
    const factors = { ...DEFAULT_FACTORS, ...(await bedroomFactors().catch(() => ({}))) };
    const b = Math.min(Math.max(Math.round(bedrooms), 0), 5);
    const factor = factors[b] ?? 1;
    const base = adr * 365 * occupancy;
    const mid = Math.round((base * factor) / 100) * 100;
    return {
      market: [m.district, m.locality].filter(Boolean).join(', ') || m.full_name || 'your area',
      low: Math.round((mid * 0.75) / 100) * 100, mid, high: Math.round((mid * 1.3) / 100) * 100,
      occupancy, nightly: Math.round(adr * Math.sqrt(factor)), activeListings: s.active_listings_count ?? null, bedrooms: b, factor,
    };
  } catch (e) {
    console.error('estimate', e);
    return { error: 'We couldn’t work out an estimate just now. Try again in a minute.' };
  }
}
