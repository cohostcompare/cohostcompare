import { NextResponse, type NextRequest } from 'next/server';
import { adminClient } from '@/lib/supabase/server';

/*
 Partner logos are served from here instead of hot-linking the partner's file: owners' browsers never
 contact the partner's server, and a logo that moves, grows or stops being an image just shows the fallback.
 Image types only, at most 1 MB, cached for a day.
*/
const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 6000;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const miss = (status = 404) => new NextResponse(null, { status, headers: { 'Cache-Control': 'public, max-age=3600' } });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return miss();
  const { data: p } = await adminClient().from('partners').select('logo_url, status').eq('id', id).maybeSingle();
  if (!p?.logo_url || !/^https?:\/\//i.test(p.logo_url) || p.status === 'rejected') return miss();
  try {
    const r = await fetch(p.logo_url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow', headers: { Accept: 'image/*' }, cache: 'no-store' });
    const type = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!r.ok || !type.startsWith('image/')) return miss();
    const declared = Number(r.headers.get('content-length') || 0);
    if (declared > MAX_BYTES) return miss(413);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) return miss(413);
    return new NextResponse(buf, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(buf.byteLength), 'Cache-Control': 'public, max-age=86400, s-maxage=86400', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } });
  } catch { return miss(); }
}
