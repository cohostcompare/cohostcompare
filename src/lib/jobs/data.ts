import 'server-only';
import { adminClient } from '@/lib/supabase/server';

/* Admin data jobs (ported from the old root /api functions): AirROI sweep, manager clustering and seeding. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function listingRow(l: Any) {
  const h = l.host_info || {}, loc = l.location_info || {}, p = l.property_details || {}, rt = l.ratings || {}, pm = l.performance_metrics || {}, pr = l.pricing_info || {};
  return {
    listing_id: String(l.listing_info?.listing_id ?? ''),
    host_id: h.host_id != null ? String(h.host_id) : null, host_name: h.host_name ?? null,
    cohost_ids: (h.cohost_ids || []).map(String), cohost_names: (h.cohost_names || []).map(String),
    professional: h.professional_management ?? null, superhost: h.superhost ?? null,
    lat: loc.latitude ?? null, lng: loc.longitude ?? null, locality: loc.locality ?? null, district: loc.district ?? null, region: loc.region ?? null,
    bedrooms: p.bedrooms ?? null, num_reviews: rt.num_reviews ?? null, rating_overall: rt.rating_overall ?? null,
    ttm_revenue: pm.ttm_revenue ?? null, ttm_occupancy: pm.ttm_occupancy ?? null, ttm_avg_rate: pm.ttm_avg_rate ?? null,
    registration: p.registration ?? null, cleaning_fee: pr.cleaning_fee ?? null, currency: pr.currency ?? null,
    fetched_at: new Date().toISOString(),
  };
}

/** US$ per AirROI listings search call (standard pricing, airroi.com/api/pricing). */
export const AIRROI_CALL_USD = 0.5;

/** Pages through AirROI for one sweep area. Costs AIRROI_CALL_USD per call. Disabled unless AIRROI_SWEEP_ENABLED=1. */
/** Spend so far against AIRROI_BUDGET_USD. The tally starts when a budget amount is first used, so a new amount starts fresh. */
export async function sweepBudget() {
  const budget = Number(process.env.AIRROI_BUDGET_USD || 0);
  const db = adminClient();
  const { data: cells } = await db.from('sweep_cells').select('calls_used');
  const total = (cells || []).reduce((s, c) => s + (c.calls_used || 0), 0);
  if (!budget) return { budget: 0, spent: 0, left: 0, total };
  const key = `budget:${budget}`;
  const { data: row } = await db.from('market_cache').select('data').eq('key', key).maybeSingle();
  let baseline = (row?.data as { baselineCalls?: number } | null)?.baselineCalls;
  if (baseline == null) { baseline = total; await db.from('market_cache').upsert({ key, data: { baselineCalls: total, startedAt: new Date().toISOString() } }); }
  const spent = (total - baseline) * AIRROI_CALL_USD;
  return { budget, spent, left: Math.max(0, budget - spent), total };
}

export async function runSweep(cellId?: string, maxCalls = 20, budgetMs = 45000) {
  if (process.env.AIRROI_SWEEP_ENABLED !== '1') throw new Error('Fetching is switched off to protect your AirROI credit. Ask Claude before switching it back on.');
  const b = await sweepBudget();
  const affordable = Math.floor(b.left / AIRROI_CALL_USD);
  if (affordable <= 0) throw new Error(b.budget ? `Budget of US$${b.budget} used up (US$${b.spent.toFixed(2)} spent).` : 'Set AIRROI_BUDGET_USD in Vercel first.');
  maxCalls = Math.min(maxCalls, affordable);
  const db = adminClient();
  const started = Date.now();
  const q = db.from('sweep_cells').select('*');
  const { data: cells } = cellId ? await q.eq('id', cellId).limit(1) : await q.eq('done', false).order('id').limit(1);
  const cell = cells?.[0];
  if (!cell) return { message: 'Every sweep area is finished.', finished: true };
  let offset = cell.next_offset as number, calls = 0, stored = 0, done = cell.done as boolean;
  // Only professionally managed homes (that's who we profile), and at most AREA_CAP calls per area.
  const AREA_CAP = Number(process.env.AIRROI_AREA_CAP || 10);
  if (cell.calls_used >= AREA_CAP) done = true;
  while (!done && calls < Math.min(maxCalls, 50, AREA_CAP - cell.calls_used) && Date.now() - started < budgetMs) {
    const r = await fetch('https://api.airroi.com/listings/search/radius', {
      method: 'POST',
      headers: { 'x-api-key': (process.env.AIRROI_API_KEY || '').trim(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: cell.lat, longitude: cell.lng, radius_miles: Number(cell.radius_miles), currency: 'native',
        filter: { room_type: { eq: 'entire_home' }, professional_management: { eq: true } }, sort: { ttm_revenue: 'desc' }, pagination: { page_size: 10, offset } }),
    });
    calls++;
    const data = await r.json();
    if (!r.ok) throw new Error(`AirROI ${r.status}: ${JSON.stringify(data).slice(0, 300)}`);
    const rows = (data.results || []).map(listingRow).filter((x: Any) => x.listing_id);
    if (rows.length) {
      const { error } = await db.from('str_listings').upsert(rows, { onConflict: 'listing_id' });
      if (error) throw new Error(error.message);
    }
    stored += rows.length; offset += 10;
    if ((data.results || []).length < 10) done = true;
  }
  await db.from('sweep_cells').update({ next_offset: offset, done, listings_seen: cell.listings_seen + stored, calls_used: cell.calls_used + calls, updated_at: new Date().toISOString() }).eq('id', cell.id);
  return { cell: cell.id, label: cell.label, calls, stored, done, totalSeen: cell.listings_seen + stored };
}

const CITY_WORDS = /\b(sydney|melbourne|anz|australia|au|nsw|vic|pty|ltd)\b/g;
export const norm = (s: unknown) => String(s || '').toLowerCase().replace(/accommodaton/g, 'accommodation').replace(CITY_WORDS, '').replace(/[^a-z]/g, '');
export const businessLike = (s: unknown) => (/\s/.test(String(s).trim()) && !/^[A-Z][a-z]+ (and|&) [A-Z][a-z]+$/.test(String(s).trim()))
  || /(stay|host|home|holiday|apartment|management|property|bnb|comfy|luxe|abode|time|butler|rental|hotel|living)/i.test(String(s));

export async function loadListings() {
  const db = adminClient();
  let rows: Any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('str_listings').select('listing_id,host_id,host_name,cohost_ids,cohost_names,professional,rating_overall,num_reviews,locality,ttm_occupancy,ttm_avg_rate').range(from, from + 999);
    if (error) throw new Error(error.message);
    rows = rows.concat(data || []);
    if (!data || data.length < 1000) break;
  }
  return rows;
}

type Op = { id: string; name: string; listings: Set<string> };
/** Groups host/co-host accounts into manager businesses (mostly shared listings, or the same business name). */
export function cluster(rows: Any[]) {
  const ops = new Map<string, Op>();
  const add = (id: string | null, name: string, l: Any) => {
    if (!id) return;
    if (!ops.has(id)) ops.set(id, { id, name, listings: new Set() });
    ops.get(id)!.listings.add(l.listing_id);
  };
  for (const l of rows) { add(l.host_id, l.host_name, l); (l.cohost_ids || []).forEach((c: string, i: number) => add(c, (l.cohost_names || [])[i], l)); }
  const big = [...ops.values()].filter((o) => o.listings.size >= 3);
  const parent = new Map(big.map((o) => [o.id, o.id]));
  const find = (x: string): string => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!));
  for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {
    const a = big[i], b = big[j];
    const [s, t] = a.listings.size <= b.listings.size ? [a, b] : [b, a];
    let shared = 0; for (const x of s.listings) if (t.listings.has(x)) shared++;
    if (shared / s.listings.size >= 0.6) parent.set(find(a.id), find(b.id));
    else if (norm(a.name).length >= 5 && norm(a.name) === norm(b.name) && businessLike(a.name)) parent.set(find(a.id), find(b.id));
  }
  const groups = new Map<string, { accounts: Op[]; listings: Set<string> }>();
  for (const o of big) {
    const g = find(o.id);
    if (!groups.has(g)) groups.set(g, { accounts: [], listings: new Set() });
    groups.get(g)!.accounts.push(o);
    o.listings.forEach((x) => groups.get(g)!.listings.add(x));
  }
  return [...groups.values()];
}

/** Businesses found in the data that don't have a profile yet, busiest first (for researching new managers). */
export async function newBusinesses(min = 6) {
  const rows = await loadListings();
  const { data: mgrs } = await adminClient().from('managers').select('airbnb_host_ids');
  const known = new Set((mgrs || []).flatMap((m) => m.airbnb_host_ids || []));
  const byId = new Map(rows.map((l) => [l.listing_id, l]));
  return cluster(rows)
    .filter((g) => g.listings.size >= min && !g.accounts.some((a) => known.has(a.id)))
    .map((g) => {
      const ls = [...g.listings].map((id) => byId.get(id)).filter(Boolean);
      const names = g.accounts.sort((a, b) => b.listings.size - a.listings.size).map((a) => a.name);
      const rated = ls.filter((l) => l.num_reviews > 0 && l.rating_overall != null);
      return {
        name: names.find(businessLike) || names[0], business: Boolean(names.find(businessLike)), accounts: names,
        listings: ls.length, avgRating: rated.length ? +(rated.reduce((s, l) => s + Number(l.rating_overall), 0) / rated.length).toFixed(2) : null,
        localities: [...new Set(ls.map((l) => l.locality).filter(Boolean))].slice(0, 6) as string[],
      };
    })
    .sort((a, b) => b.listings - a.listings);
}

/** Creates/updates manager profiles from the researched seed list, linked to their Airbnb accounts. */
export async function seedManagers() {
  const { SEED } = await import('./seed');
  const groups = cluster(await loadListings());
  const report: Any[] = []; const rows: Any[] = [];
  for (const s of SEED) {
    const g = s.match?.length ? groups.find((grp) => grp.accounts.some((a) => s.match.includes(norm(a.name)))) : null;
    // Businesses found by web research (e.g. not on Airbnb) have no listing data: they cover their declared postcodes.
    if (!g && !s.webOnly) { report.push({ slug: s.slug, matched: false }); continue; }
    rows.push({
      slug: s.slug, name: s.name, tagline: s.tagline || null, about: s.about || null,
      airbnb_host_ids: g ? g.accounts.map((a) => a.id) : [], website: s.website || null, ...(s.postcodes ? { postcodes: s.postcodes } : {}), cities: s.cities || [], platforms: s.platforms || ['Airbnb'], services: s.services || [],
      fee_min: s.fee_min ?? null, fee_max: s.fee_max ?? null, fee_note: s.fee_note || null, licensed_agent: s.licensed_agent ?? null,
      gated: s.gated || {}, sources: s.sources || [], published: Boolean(s.published), updated_at: new Date().toISOString(),
    });
    report.push({ slug: s.slug, matched: Boolean(g), webOnly: Boolean(s.webOnly), accounts: g?.accounts.length ?? 0, listings: g?.listings.size ?? 0 });
  }
  // Never re-publish a manager an admin has hidden, and never overwrite a profile its manager has claimed and edited.
  const { data: existing } = await adminClient().from('managers').select('slug, published, claimed');
  const bySlug = new Map((existing || []).map((e) => [e.slug, e]));
  const toSave = rows.filter((r) => !bySlug.get(r.slug)?.claimed).map((r) => (bySlug.get(r.slug) && !bySlug.get(r.slug)!.published ? { ...r, published: false } : r));
  // Upsert rows with the same columns together (web-only rows also set postcodes).
  for (const batch of [toSave.filter((r) => 'postcodes' in r), toSave.filter((r) => !('postcodes' in r))]) {
    if (!batch.length) continue;
    const { error } = await adminClient().from('managers').upsert(batch, { onConflict: 'slug', defaultToNull: false });
    if (error) throw new Error(error.message);
  }
  return { saved: toSave.length, skippedClaimed: rows.length - toSave.length, report };
}
