import { NextResponse } from 'next/server';
import { buildGuidePdf, guideOk } from '@/lib/guide';
import { adminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** The setup guide PDF, for a signed sign-up link. Built fresh each time from the current rules. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = u.searchParams.get('i') || '', s = u.searchParams.get('s') || '';
  if (!/^[0-9a-f-]{36}$/.test(id) || !guideOk(id, s)) return NextResponse.redirect(new URL('/setup#guide-h', u));
  const db = adminClient();
  const { data } = await db.from('guide_signups').select('state, downloads').eq('id', id).maybeSingle();
  if (!data) return NextResponse.redirect(new URL('/setup#guide-h', u));
  await db.from('guide_signups').update({ downloads: (data.downloads || 0) + 1 }).eq('id', id);
  const pdf = await buildGuidePdf(data.state);
  return new NextResponse(Buffer.from(pdf), { headers: { 'content-type': 'application/pdf', 'content-disposition': `inline; filename="short-term-rental-setup-guide-${data.state}.pdf"`, 'cache-control': 'private, no-store' } });
}
