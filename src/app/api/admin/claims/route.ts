import { NextResponse, type NextRequest } from 'next/server';
import { approveClaim, verify } from '@/lib/claims';
import { sendEmail } from '@/lib/email';
import { adminClient } from '@/lib/supabase/server';

const esc = (t: unknown) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const page = (title: string, body: string) =>
  new NextResponse(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:Arial,sans-serif;background:#F3F6F5;color:#10302F;padding:40px 16px"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #DCE5E2;border-radius:14px;padding:28px"><h1 style="font-size:22px;margin:0 0 8px">${title}</h1><p style="margin:0;color:#4A605D">${body}</p></div></body>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

// Approve or reject a manual claim from the link emailed to hello@.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || '';
  const action = url.searchParams.get('action');
  if (!verify(id, url.searchParams.get('sig') || '') || !['approve', 'reject'].includes(action || '')) return new NextResponse('Not found', { status: 404 });

  const db = adminClient();
  const { data: c } = await db.from('manager_claims').select('id, email, name, status, managers(name)').eq('id', id).single();
  if (!c) return page('Claim not found', 'It may have been removed.');
  const mgr = (Array.isArray(c.managers) ? c.managers[0] : c.managers) as { name: string } | null;
  if (c.status !== 'pending') return page('Already decided', `This claim was already ${esc(c.status)}.`);

  if (action === 'approve') {
    await approveClaim(c.id);
    await sendEmail({
      to: c.email,
      subject: `You now manage ${mgr?.name} on CoHostCompare`,
      text: `Hi ${c.name},\n\nYour claim for ${mgr?.name} has been approved. In your dashboard you can add your fees, services, logo and photos, and reply to owners' quote requests.\n\nThe CoHostCompare team`,
      cta: { label: 'Open my dashboard', url: `${url.origin}/dashboard` },
    });
    return page('Claim approved', `${esc(c.name)} now manages ${esc(mgr?.name)}. We've emailed them a link to their dashboard.`);
  }
  await db.from('manager_claims').update({ status: 'rejected', decided_at: new Date().toISOString() }).eq('id', c.id);
  return page('Claim rejected', `${esc(c.name)}'s claim for ${esc(mgr?.name)} was rejected. They weren't emailed; reply to them from hello@ if you want to explain.`);
}
