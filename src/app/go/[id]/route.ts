import { NextResponse, type NextRequest } from 'next/server';
import { getSetting, offerLink } from '@/lib/partners';
import { adminClient } from '@/lib/supabase/server';
import { BOT } from '@/lib/traffic';

// Partner offer click-through: counts the click (no owner details), then sends the owner to the partner.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const home = new URL('/setup', req.url);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(home);
  const db = adminClient();
  // Same gate as the offers themselves: approved, agreement accepted, and offers switched on. Anything else goes back to /setup.
  const [{ data: p }, live] = await Promise.all([
    db.from('partners').select('offer_url, website, status, agreed_at').eq('id', id).maybeSingle(),
    getSetting<boolean>('offers_live', false).catch(() => false),
  ]);
  const to = live && p?.status === 'approved' && p.agreed_at ? offerLink(p) : null;
  if (!to) return NextResponse.redirect(home);
  if (!BOT.test(req.headers.get('user-agent') || '')) await db.from('partner_clicks').insert({ partner_id: id }).then(() => {}, () => {});
  return NextResponse.redirect(to, 302);
}
