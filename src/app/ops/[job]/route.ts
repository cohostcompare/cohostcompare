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
    return new NextResponse('Not found', { status: 404 });
  } catch (e) {
    return new NextResponse(`ERROR ${String((e as Error).message || e)}`, { headers });
  }
}
