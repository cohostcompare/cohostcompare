import { NextResponse, type NextRequest } from 'next/server';
import { businessLike, cluster, listingRow, loadListings } from '@/lib/jobs/data';
import { adminClient } from '@/lib/supabase/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/*
 * Nov 2026 AirROI data test (Ben approved, hard cap US$100).
 * Preview deployments only (they sit behind Vercel login). 404 everywhere else.
 * Every call is counted in market_cache before it's made, so the cap holds across runs.
 *
 *   ?action=spend                                  → calls used so far
 *   ?action=search&path=radius&body=<json>&store=1 → one call, returns pagination (+ stores rows if store=1)
 *   ?action=pull&path=polygon&body=<json, no pagination>&max=60 → pages through one area, stores rows
 */
// US$0.50 each. 93 test calls (US$46.50) + full Sydney/Melbourne pull capped at US$950 (1,900 calls).
const CAP_CALLS = 1993;
const KEY = 'airroi:test-2026-11';
const PATHS: Record<string, string> = { radius: '/listings/search/radius', market: '/listings/search/market', polygon: '/listings/search/polygon' };

async function takeCall() {
  // Atomic, so parallel batches can't overshoot the cap.
  const { data, error } = await adminClient().rpc('airroi_take_call', { p_key: KEY, p_cap: CAP_CALLS });
  if (error) throw new Error(error.message);
  if (data === -1) throw new Error(`Cap reached: ${CAP_CALLS} calls (US$${(CAP_CALLS * 0.5).toFixed(2)}).`);
  return data as number;
}

async function search(path: string, body: unknown) {
  const used = await takeCall();
  const r = await fetch(`https://api.airroi.com${PATHS[path] || PATHS.radius}`, {
    method: 'POST',
    headers: { 'x-api-key': (process.env.AIRROI_API_KEY || '').trim(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data, used };
}

async function store(results: unknown[]) {
  const rows = (results || []).map(listingRow).filter((x) => x.listing_id);
  if (!rows.length) return 0;
  const { error } = await adminClient().from('str_listings').upsert(rows, { onConflict: 'listing_id' });
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview') return new NextResponse('Not found', { status: 404 });
  const p = req.nextUrl.searchParams;
  try {
    const action = p.get('action');
    if (action === 'spend') {
      const { data } = await adminClient().from('market_cache').select('data').eq('key', KEY).maybeSingle();
      const calls = Number((data?.data as { calls?: number } | null)?.calls || 0);
      return NextResponse.json({ calls, usd: calls * 0.5, cap: CAP_CALLS });
    }
    if (action === 'search') {
      const body = JSON.parse(p.get('body') || '{}');
      const r = await search(p.get('path') || 'radius', body);
      const results = (r.data?.results || []) as Record<string, Record<string, unknown>>[];
      const stored = r.ok && p.get('store') === '1' ? await store(results) : 0;
      return NextResponse.json({
        ok: r.ok, status: r.status, callsUsed: r.used, pagination: r.data?.pagination ?? null, returned: results.length, stored,
        error: r.ok ? undefined : JSON.stringify(r.data).slice(0, 500),
        sample: results.slice(0, 3).map((l) => ({ id: l.listing_info?.listing_id, host: l.host_info?.host_id, cohosts: l.host_info?.cohost_ids, locality: l.location_info?.locality })),
      });
    }
    if (action === 'pull') {
      // body = search body without pagination (radius or polygon); path picks the endpoint.
      const body = JSON.parse(p.get('body') || '{}');
      const path = p.get('path') || 'radius';
      const size = 10, max = Math.min(Number(p.get('max') || 60), CAP_CALLS);
      let offset = Number(p.get('offset') || 0), calls = 0, stored = 0, total: number | null = null, done = false;
      const started = Date.now();
      while (!done && calls < max && Date.now() - started < 270000) {
        const r = await search(path, { ...body, pagination: { page_size: size, offset } });
        calls++;
        if (!r.ok) return NextResponse.json({ error: JSON.stringify(r.data).slice(0, 500), calls, stored, offset, total });
        total = r.data?.pagination?.total_count ?? total;
        const results = r.data?.results || [];
        stored += await store(results);
        offset += size;
        if (results.length < size || (total != null && offset >= total)) done = true;
      }
      return NextResponse.json({ calls, stored, nextOffset: offset, total, done });
    }
    if (action === 'candidates') {
      // No AirROI calls. Groups accounts the same way as newBusinesses(), then splits into:
      // new = groups with no known account; extra = unlinked accounts grouped with a known manager.
      const min = Number(p.get('min') || 5);
      const rows = await loadListings();
      const { data: mgrs } = await adminClient().from('managers').select('slug, name, published, airbnb_host_ids');
      const owner = new Map<string, { slug: string; name: string; published: boolean }>();
      for (const m of mgrs || []) for (const h of m.airbnb_host_ids || []) owner.set(h, { slug: m.slug, name: m.name, published: m.published });
      const byId = new Map(rows.map((l) => [l.listing_id, l]));
      const fresh = (g: { listings: Set<string> }) => [...g.listings].map((id) => byId.get(id)).filter(Boolean);
      const groups = cluster(rows);
      const out = { fresh: [] as unknown[], extra: [] as unknown[] };
      for (const g of groups) {
        const knownAcc = g.accounts.filter((a) => owner.has(a.id));
        const ls = fresh(g);
        const rated = ls.filter((l) => l.num_reviews > 0 && Number(l.rating_overall) > 0);
        const rating = rated.length ? +(rated.reduce((s, l) => s + Number(l.rating_overall), 0) / rated.length).toFixed(2) : null;
        const accounts = g.accounts.sort((a, b) => b.listings.size - a.listings.size);
        if (!knownAcc.length) {
          if (g.listings.size < min) continue;
          const names = accounts.map((a) => a.name);
          out.fresh.push({ name: names.find(businessLike) || names[0], business: Boolean(names.find(businessLike)), accounts: accounts.map((a) => `${a.name} (${a.id}, ${a.listings.size})`),
            homes: g.listings.size, rating, places: [...new Set(ls.map((l) => l.locality).filter(Boolean))].slice(0, 5) });
        } else {
          const mgrSet = [...new Set(knownAcc.map((a) => owner.get(a.id)!.slug))];
          const unknown = accounts.filter((a) => !owner.has(a.id) && a.listings.size >= 3);
          if (!unknown.length) continue;
          out.extra.push({ managers: mgrSet, unlinked: unknown.map((a) => `${a.name} (${a.id}, ${a.listings.size})`), groupHomes: g.listings.size });
        }
      }
      (out.fresh as { homes: number }[]).sort((a, b) => b.homes - a.homes);
      return NextResponse.json({ freshCount: out.fresh.length, extraCount: out.extra.length, ...out });
    }
    return NextResponse.json({ error: 'action=spend|search|pull|candidates' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
