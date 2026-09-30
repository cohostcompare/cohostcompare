import { NextResponse, type NextRequest } from 'next/server';
import { newBusinesses } from '@/lib/jobs/data';
import { adminClient } from '@/lib/supabase/server';

export const maxDuration = 60;
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
