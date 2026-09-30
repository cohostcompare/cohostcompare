import { NextResponse, type NextRequest } from 'next/server';
import { newBusinesses, seedManagers } from '@/lib/jobs/data';
import { adminClient } from '@/lib/supabase/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Plain-text data exports for Claude's research (token only; 404 otherwise). Not linked anywhere.
export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const expected = (process.env.ADMIN_TOKEN || '').replace(/[`'"\s]/g, '');
  if (!expected || (req.nextUrl.searchParams.get('pass') || '').trim() !== expected) return new NextResponse('Not found', { status: 404 });
  const { job } = await params;
  const p = req.nextUrl.searchParams;
  const headers = { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-store' };
  try {
    if (job === 'new-businesses') {
      const list = await newBusinesses(Number(p.get('min') || 5));
      const from = Number(p.get('from') || 0), n = Number(p.get('n') || 60);
      const lines = list.slice(from, from + n).map((b, i) => `${from + i + 1}. ${b.name} | ${b.business ? 'business' : 'maybe-individual'} | ${b.listings} homes | ${b.avgRating ?? '-'} | accounts: ${b.accounts.join('; ')} | ${b.localities.join(', ')}`);
      return new NextResponse(`TOTAL ${list.length}\n${lines.join('\n')}`, { headers });
    }
    if (job === 'managers') {
      const { data } = await adminClient().from('managers').select('slug, name, website, published, claimed').order('name');
      return new NextResponse((data || []).map((m) => `${m.slug} | ${m.name} | ${m.website || '-'} | ${m.published ? 'published' : 'hidden'}${m.claimed ? ' | claimed' : ''}`).join('\n'), { headers });
    }
    if (job === 'reports') {
      const { runReports } = await import('@/lib/reports');
      const r = await runReports(Number(p.get('n') || 8));
      return new NextResponse(JSON.stringify(r), { headers });
    }
    if (job === 'report-preview') {
      const { allRegions, buildReport } = await import('@/lib/reports');
      const regions = await allRegions();
      const a = regions.find((x) => x.slug === p.get('region'));
      if (!a) return new NextResponse(`regions: ${regions.map((r) => `${r.slug} (${r.areas.length})`).join(', ')}`, { headers });
      const { data } = await buildReport(a);
      return new NextResponse(`homes ${data.market.homes} | nightly ${data.market.nightly} | revenue ${data.market.revenue} | occ ${data.market.occupancy} | seasonality ${data.seasonality ? data.seasonality.map((m) => `${m.month}:${m.occupancy?.toFixed(2)}/${m.nightly}`).join(' ') : 'none'} | managers ${data.managers.count} fee ${data.managers.feeMedian} | suburbs ${(data.suburbs || []).map((x) => `${x.label}:${x.homes}`).join(', ')}`, { headers });
    }
    if (job === 'seed') {
      const r = await seedManagers();
      return new NextResponse(`saved ${r.saved}, claimed untouched ${r.skippedClaimed}, unmatched ${r.report.filter((x: { matched: boolean; webOnly?: boolean }) => !x.matched && !x.webOnly).map((x: { slug: string }) => x.slug).join(', ') || 'none'}`, { headers });
    }
    if (job === 'qa') {
      // Automatic checks on every published profile; prints only the problems.
      const db = adminClient();
      const { data: ms } = await db.from('managers').select('slug, name, cities, tagline, about, website, published, claimed, postcodes, airbnb_host_ids').eq('published', true).order('name');
      const rows: { host_id: string | null; cohost_ids: string[] | null; rating_overall: number | null; num_reviews: number | null; ttm_occupancy: number | null }[] = [];
      for (let f = 0; ; f += 1000) {
        const { data } = await db.from('str_listings').select('host_id, cohost_ids, rating_overall, num_reviews, ttm_occupancy').range(f, f + 999);
        rows.push(...(data || [])); if (!data || data.length < 1000) break;
      }
      const dom = (u: string | null) => { try { return u ? new URL(u).hostname.replace(/^www\./, '') : null; } catch { return null; } };
      const domains = new Map<string, string[]>();
      const out: string[] = [];
      for (const m of ms || []) {
        const ids = new Set(m.airbnb_host_ids || []);
        const ls = ids.size ? rows.filter((l) => (l.host_id && ids.has(l.host_id)) || (l.cohost_ids || []).some((c) => ids.has(c))) : [];
        const rated = ls.filter((l) => (l.num_reviews || 0) > 0 && Number(l.rating_overall) > 0);
        const rating = rated.length ? rated.reduce((a, l) => a + Number(l.rating_overall), 0) / rated.length : null;
        const occ = ls.filter((l) => Number(l.ttm_occupancy) > 0);
        const occAvg = occ.length ? occ.reduce((a, l) => a + Number(l.ttm_occupancy), 0) / occ.length : null;
        const f: string[] = [];
        if (!m.tagline) f.push('T'); else if (m.tagline.length > 80) f.push(`T${m.tagline.length}`);
        if (!m.about || m.about.length < 40) f.push('A');
        if (/[()|]/.test(m.name)) f.push('N');
        if (!(m.cities || []).length) f.push('R');
        if (ids.size && !ls.length) f.push('L0');
        if (!ids.size && !(m.postcodes || []).length) f.push('S');
        if (rating != null && rating < 4.3) f.push(`r${rating.toFixed(2)}/${rated.length}`);
        if (ls.length && rated.length < 3) f.push(`few${rated.length}`);
        if (occAvg != null && occAvg < 0.35) f.push(`o${Math.round(occAvg * 100)}`);
        if (!m.website) f.push('W');
        const d = dom(m.website); if (d) domains.set(d, [...(domains.get(d) || []), m.slug]);
        if (f.length) out.push(`${m.slug} ${ls.length}h ${f.join(',')}`);
      }
      const dups = [...domains.entries()].filter(([, v]) => v.length > 1).map(([d, v]) => `shared website ${d}: ${v.join(', ')}`);
      const from = Number(p.get('from') || 0), n = Number(p.get('n') || 15);
      return new NextResponse(`PUBLISHED ${(ms || []).length} ISSUES ${out.length}\n${out.slice(from, from + n).join('\n')}${from === 0 ? `\n${dups.join('\n')}` : ''}`, { headers });
    }
    if (job === 'profiles') {
      const db = adminClient();
      const [{ data: ms }, { data: st }] = await Promise.all([
        db.from('managers').select('id, slug, name, cities, tagline, about, website, fee_min, fee_max, claimed, published, postcodes, airbnb_host_ids, services, platforms').order('name'),
        db.from('manager_stats').select('manager_id, property_count, avg_rating, review_count, avg_occupancy, avg_nightly_rate'),
      ]);
      const by = new Map((st || []).map((x) => [x.manager_id, x]));
      const from = Number(p.get('from') || 0), n = Number(p.get('n') || 80);
      const lines = (ms || []).slice(from, from + n).map((m) => { const x = by.get(m.id); return [m.slug, m.name, (m.cities || []).join('/'), m.tagline || '-', (m.about || '').length, m.website || '-', x?.property_count ?? 0, x?.avg_rating ?? '-', x?.review_count ?? 0, x?.avg_occupancy ?? '-', x?.avg_nightly_rate ?? '-', m.fee_min ?? '-', m.published ? 'pub' : 'hidden', m.claimed ? 'claimed' : '', (m.postcodes || []).length, (m.airbnb_host_ids || []).length, (m.services || []).length, (m.platforms || []).join('/')].join(' | '); });
      return new NextResponse(`TOTAL ${(ms || []).length}\nslug | name | cities | tagline | aboutLen | website | homes | rating | reviews | occ | rate | fee | pub | claimed | postcodes | accounts | services | platforms\n${lines.join('\n')}`, { headers });
    }
    if (job === 'ratings') {
      // Distribution of listing ratings, to sanity-check averages. Optional ?name= filters host/cohost name.
      const db = adminClient();
      let q = db.from('str_listings').select('rating_overall, num_reviews, host_name').limit(5000);
      const name = p.get('name');
      if (name) q = q.ilike('host_name', `%${name}%`);
      const { data } = await q;
      const rows = data || [];
      const buckets: Record<string, number> = {};
      for (const r of rows) { const k = r.rating_overall == null ? 'null' : r.num_reviews ? String(Math.floor(Number(r.rating_overall))) : 'no-reviews'; buckets[k] = (buckets[k] || 0) + 1; }
      const sample = rows.slice(0, 25).map((r) => `${r.host_name} | rating ${r.rating_overall} | reviews ${r.num_reviews}`);
      return new NextResponse(`rows ${rows.length}\nbuckets ${JSON.stringify(buckets)}\n${sample.join('\n')}`, { headers });
    }
    return new NextResponse('Not found', { status: 404 });
  } catch (e) {
    return new NextResponse(`ERROR ${String((e as Error).message || e)}`, { headers });
  }
}
