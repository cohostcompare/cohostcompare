import { NextResponse, type NextRequest } from 'next/server';
import { adminClient } from '@/lib/supabase/server';
import { BOT } from '@/lib/traffic';

// Partner offer click-through: counts the click (no owner details), then sends the owner to the partner.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const home = new URL('/setup', req.url);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(home);
  const db = adminClient();
  const { data: p } = await db.from('partners').select('offer_url, website, status').eq('id', id).maybeSingle();
  const to = p?.status === 'approved' ? p.offer_url || p.website : null;
  if (!to) return NextResponse.redirect(home);
  if (!BOT.test(req.headers.get('user-agent') || '')) await db.from('partner_clicks').insert({ partner_id: id }).then(() => {}, () => {});
  return NextResponse.redirect(to, 302);
}
