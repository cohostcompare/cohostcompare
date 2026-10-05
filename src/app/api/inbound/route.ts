import { NextResponse, type NextRequest } from 'next/server';
import { sendEmail } from '@/lib/email';
import { bareEmail, fetchReceived, htmlToText, parseAddress, stripReply, verifyWebhook } from '@/lib/inbound';
import { memberEmails } from '@/lib/managers';
import { adminClient } from '@/lib/supabase/server';
import { postManagerMessage, postOwnerMessage } from '@/lib/threads';

export const dynamic = 'force-dynamic';

// Resend inbound webhook (event email.received). See src/lib/inbound.ts.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const ok = verifyWebhook(raw, { id: req.headers.get('svix-id'), timestamp: req.headers.get('svix-timestamp'), signature: req.headers.get('svix-signature') });
  if (!ok) return new NextResponse('Bad signature', { status: 401 });
  const evt = JSON.parse(raw) as { type?: string; data?: { email_id?: string; from?: string; to?: string[]; subject?: string; bounce?: { message?: string; type?: string; subType?: string } } };
  if (evt.type === 'email.bounced' || evt.type === 'email.complained') return handleBounce(evt.type === 'email.bounced' ? 'bounced' : 'complained', evt.data || {});
  if (evt.type === 'email.opened' || evt.type === 'email.clicked') return handleEngagement(evt.type === 'email.opened' ? 'opened' : 'clicked', evt.data || {});
  if (evt.type !== 'email.received' || !evt.data?.email_id) return NextResponse.json({ ignored: true });
  const d = evt.data;
  const db = adminClient();

  // Resend retries webhooks, so each email is handled once.
  const { error: dup } = await db.from('inbound_emails').insert({ email_id: d.email_id, from_email: bareEmail(d.from || ''), to_address: (d.to || []).join(', '), subject: (d.subject || '').slice(0, 300) });
  if (dup) {
    if (dup.code === '23505') return NextResponse.json({ duplicate: true });
    console.error('inbound log', dup); // table missing (run 012): carry on anyway
  }

  const from = bareEmail(d.from || '');
  const target = (d.to || []).map(parseAddress).find(Boolean) ?? null;
  const mail = await fetchReceived(d.email_id!);
  const text = stripReply(mail?.text || (mail?.html ? htmlToText(mail.html) : ''));
  const log = (outcome: string) => db.from('inbound_emails').update({ outcome }).eq('email_id', d.email_id!);
  const forward = async (why: string) => {
    await sendEmail({ to: 'hello@cohostcompare.com', subject: `Email reply to check: ${d.subject || '(no subject)'}`, text: `${why}\n\nFrom: ${d.from}\nTo: ${(d.to || []).join(', ')}\n\n${text || '(empty)'}`, replyTo: from || undefined });
    await log(`forwarded: ${why}`);
    return NextResponse.json({ forwarded: true });
  };

  if (!target) return forward('Sent to an address we don’t recognise.');

  if (target.kind === 'outreach') {
    await db.from('outreach_contacts').update({ status: 'replied' }).eq('id', target.contactId).in('status', ['active', 'paused', 'finished']);
    await log('outreach reply: sequence stopped');
    return NextResponse.json({ outreach: true }); // Ben already has it: hello@ is the first Reply-To.
  }

  if (!text) return forward('The reply was empty after removing the quoted email.');
  const { data: t } = await db.from('quote_request_managers').select('id, manager_slug, request_id').eq('id', target.threadId).maybeSingle();
  if (!t) return forward('The conversation no longer exists.');

  if (target.side === 'o') {
    const { data: r } = await db.from('quote_requests').select('owner_email').eq('id', t.request_id).single();
    if (!r || bareEmail(r.owner_email) !== from) return forward(`Owner reply came from ${from}, not the owner’s address, so it wasn’t posted.`);
    await postOwnerMessage(t.id, text, from, 'email');
  } else {
    const team = (await memberEmails(t.manager_slug)).map((e) => e.toLowerCase());
    if (!team.includes(from)) return forward(`Manager reply came from ${from}, who isn’t on the ${t.manager_slug} team, so it wasn’t posted.`);
    await postManagerMessage(t.id, text, 'email');
  }
  await log(`posted to thread ${t.id} (${target.side === 'o' ? 'owner' : 'manager'})`);
  return NextResponse.json({ posted: true });
}

/**
 * A bounce or spam complaint (Resend events email.bounced / email.complained, ticked on the same webhook):
 * stop emailing that address everywhere (email_suppressions), end any outreach to it, drop setup guide tips,
 * and log it to email_failures (SQL 027) so it shows on /admin.
 */
/** Opens and clicks (Resend tracking, SQL 029). Click links are stored without utm_* parameters. */
async function handleEngagement(kind: 'opened' | 'clicked', d: { email_id?: string; to?: string[]; subject?: string; click?: { link?: string } }) {
  const db = adminClient();
  const addrs = [...new Set((d.to || []).map(bareEmail).filter((e) => e.includes('@')))];
  let link: string | null = null;
  if (kind === 'clicked' && d.click?.link) {
    try { const u = new URL(d.click.link); [...u.searchParams.keys()].filter((k) => k.startsWith('utm_')).forEach((k) => u.searchParams.delete(k)); link = u.toString().slice(0, 500); } catch { link = d.click.link.slice(0, 500); }
  }
  for (const to_email of addrs) {
    await db.from('email_events').insert({ email_id: d.email_id || null, to_email, kind, subject: (d.subject || '').slice(0, 300), link }).then(() => {}, (e) => console.error('email_events', e));
  }
  return NextResponse.json({ [kind]: addrs.length });
}

async function handleBounce(reason: 'bounced' | 'complained', d: { email_id?: string; to?: string[]; subject?: string; bounce?: { message?: string; type?: string; subType?: string } }) {
  const db = adminClient();
  const addrs = [...new Set((d.to || []).map(bareEmail).filter((e) => e.includes('@')))];
  const detail = [d.bounce?.type, d.bounce?.subType, d.bounce?.message, d.email_id ? `email ${d.email_id}` : ''].filter(Boolean).join(' · ').slice(0, 1000);
  for (const email of addrs) {
    await db.from('email_suppressions').upsert({ email, reason }, { onConflict: 'email', ignoreDuplicates: true }).then(() => {}, (e) => console.error('suppress', e));
    await db.from('outreach_contacts').update({ status: 'bounced' }).ilike('email', email).in('status', ['active', 'paused', 'finished']).then(() => {}, () => {});
    await db.from('guide_signups').update({ consent: false }).ilike('email', email).then(() => {}, () => {});
    await db.from('email_failures').insert({ to_domain: email.split('@')[1] || null, subject: (d.subject || '').slice(0, 300), status: reason, detail }).then(() => {}, () => {});
  }
  return NextResponse.json({ [reason]: addrs.length });
}
