import 'server-only';
import { sendEmail } from '@/lib/email';
import { memberEmails } from '@/lib/managers';
import { adminClient } from '@/lib/supabase/server';

const HOUR = 3600e3;
const ago = (h: number) => new Date(Date.now() - h * HOUR).toISOString();
const hrs = (d: string) => Math.round((Date.now() - new Date(d).getTime()) / HOUR);
const first = (n: unknown) => String(n || '').split(' ')[0] || 'there';
export const siteBase = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);

type Req = { id: string; owner_name: string; owner_email: string; address: string | null; suburb: string | null; postcode: string; all_replied_at?: string | null };

/**
 * After a manager quotes or declines: if every manager on a multi-manager request has now replied,
 * email the owner once to compare them. Returns true if that email went (so callers can skip their own).
 */
export async function notifyIfAllReplied(requestId: string, origin: string): Promise<boolean> {
  const db = adminClient();
  const { data: req, error } = await db.from('quote_requests').select('id, owner_name, owner_email, address, suburb, postcode, all_replied_at').eq('id', requestId).single();
  if (error || !req || req.all_replied_at) return false; // error = 008 not run yet
  const { data: threads } = await db.from('quote_request_managers').select('manager_name, status, quote').eq('request_id', requestId);
  const ts = threads || [];
  if (ts.length < 2 || ts.some((t) => t.status === 'sent' || t.status === 'viewed')) return false;
  const quoted = ts.filter((t) => t.quote && (t.status === 'quoted' || t.status === 'accepted'));
  if (!quoted.length) return false;
  const { data: claimed } = await db.from('quote_requests').update({ all_replied_at: new Date().toISOString() }).eq('id', requestId).is('all_replied_at', null).select('id');
  if (!claimed?.length) return false; // someone else just sent it
  const r = req as Req;
  await sendEmail({
    to: r.owner_email,
    subject: `All ${ts.length} managers have replied: compare your quotes`,
    text: `Hi ${first(r.owner_name)},\n\nEvery manager you asked about ${r.address || r.suburb || `postcode ${r.postcode}`} has now replied.\n\n${ts.map((t) => `- ${t.manager_name}: ${t.quote && (t.status === 'quoted' || t.status === 'accepted') ? `${(t.quote as { feePct: number }).feePct}% management fee` : 'can’t take it on'}`).join('\n')}\n\nYour comparison page lines the quotes up side by side: fees at the same revenue, lock-in, notice period, what's included and each manager's guest ratings near your property.\n\nThe CoHostCompare team`,
    cta: { label: 'Compare your quotes', url: `${origin}/account` },
  });
  return true;
}

/** Claims waiting on us (24h+) or on the claimant (3 days+), for the hello@ digest. */
async function claimLines(): Promise<string[]> {
  const db = adminClient();
  const { data: ours } = await db.from('manager_claims').select('name, email, status, status_changed_at, managers(name)')
    .in('status', ['pending', 'info_received']).lt('status_changed_at', ago(24)).order('status_changed_at');
  const { data: theirs } = await db.from('manager_claims').select('name, email, status_changed_at, managers(name)')
    .eq('status', 'info_requested').lt('status_changed_at', ago(72)).order('status_changed_at');
  const mgr = (c: { managers: unknown }) => one(c.managers as { name: string } | null)?.name;
  return [
    ...(ours?.length ? ['Claims waiting on us for more than 24 hours:', ...ours.map((c) => `- ${mgr(c)}: ${c.name} <${c.email}>, ${c.status === 'info_received' ? 'reply received' : 'new claim'} ${hrs(c.status_changed_at)} hours ago`), ''] : []),
    ...(theirs?.length ? ['Claims with no reply from the claimant after 3 days (consider a nudge or rejecting):', ...theirs.map((c) => `- ${mgr(c)}: ${c.name} <${c.email}>, asked ${hrs(c.status_changed_at)} hours ago`), ''] : []),
  ];
}

/** One nudge per quote an owner hasn't looked at 24h after it arrived, grouped per property. */
async function ownerReminders(): Promise<number> {
  const db = adminClient();
  const { data, error } = await db.from('quote_request_managers')
    .select('id, request_id, manager_name, quote, quoted_at, quote_requests(id, owner_name, owner_email, address, suburb, postcode)')
    .eq('status', 'quoted').is('owner_seen_at', null).is('owner_reminded_at', null).lt('quoted_at', ago(24));
  if (error || !data?.length) return 0;
  const byReq = new Map<string, typeof data>();
  for (const t of data) byReq.set(t.request_id, [...(byReq.get(t.request_id) || []), t]);
  let sent = 0;
  for (const [reqId, ts] of byReq) {
    const r = one(ts[0].quote_requests as unknown as Req | null);
    if (!r) continue;
    const { data: pending } = await db.from('quote_request_managers').select('id').eq('request_id', reqId).in('status', ['sent', 'viewed']);
    const n = ts.length;
    await sendEmail({
      to: r.owner_email,
      subject: n === 1 ? `Your quote from ${ts[0].manager_name} is waiting` : `${n} quotes are waiting for you`,
      text: `Hi ${first(r.owner_name)},\n\n${n === 1 ? 'A quote' : `${n} quotes`} for ${r.address || r.suburb || `postcode ${r.postcode}`} ${n === 1 ? 'is' : 'are'} ready to review:\n\n${ts.map((t) => `- ${t.manager_name}: ${(t.quote as { feePct: number } | null)?.feePct ?? '?'}% management fee`).join('\n')}${pending?.length ? `\n\n${pending.length} other manager${pending.length === 1 ? ' is' : 's are'} still preparing a quote.` : ''}\n\nYou can compare them side by side, ask questions or accept one from your inbox. There's no obligation.\n\nThe CoHostCompare team`,
      cta: { label: n === 1 ? 'Review the quote' : 'Compare your quotes', url: `${siteBase()}/account` },
    });
    await db.from('quote_request_managers').update({ owner_reminded_at: new Date().toISOString() }).in('id', ts.map((t) => t.id));
    sent++;
  }
  return sent;
}

/** One nudge to managers who haven't quoted 48h after a request; unclaimed ones go on our digest instead. */
async function managerReminders(): Promise<string[]> {
  const db = adminClient();
  const { data, error } = await db.from('quote_request_managers')
    .select('id, manager_slug, manager_name, created_at, quote_requests(suburb, state, postcode)')
    .in('status', ['sent', 'viewed']).is('manager_reminded_at', null).lt('created_at', ago(48));
  if (error || !data?.length) return [];
  const unclaimed: string[] = [];
  for (const t of data) {
    const r = one(t.quote_requests as unknown as { suburb: string | null; state: string | null; postcode: string } | null);
    const where = `${r?.suburb || ''} ${r?.state || ''} ${r?.postcode || ''}`.trim();
    const to = await memberEmails(t.manager_slug);
    if (to.length) {
      await sendEmail({
        to,
        subject: `An owner in ${where} is waiting for your quote`,
        text: `An owner in ${where} asked ${t.manager_name} for a quote ${Math.round(hrs(t.created_at) / 24)} days ago and hasn't heard back yet.\n\nOwners compare quotes side by side, so a quick reply matters. If you can't take the property on, you can let them know in one click.`,
        cta: { label: 'Reply to the request', url: `${siteBase()}/dashboard/requests/${t.id}` },
      });
    } else {
      unclaimed.push(`- ${t.manager_name} (unclaimed): ${where}, requested ${hrs(t.created_at)} hours ago`);
    }
    await db.from('quote_request_managers').update({ manager_reminded_at: new Date().toISOString() }).eq('id', t.id);
  }
  return unclaimed.length ? ['Quote requests to managers who haven’t claimed their profile (48h+, follow up by hand):', ...unclaimed, ''] : [];
}

/** Everything the daily cron does. */
async function abnLines(): Promise<string[]> {
  const { data, error } = await adminClient().from('managers').select('name, abn, abn_name').not('abn', 'is', null).is('abn_verified_at', null);
  if (error || !data?.length) return [];
  return ['ABNs to check by hand (Admin → Managers → Mark verified):', ...data.map((m) => `- ${m.name}: ABN ${m.abn}${m.abn_name ? `, registered to ${m.abn_name}` : ''}`), ''];
}

export async function runDaily() {
  const owners = await ownerReminders();
  const { sendOutreachBatch } = await import('@/lib/outreach');
  const outreach = await sendOutreachBatch().catch((e) => ({ sent: 0, note: String(e) }));
  const { runReports } = await import('@/lib/reports');
  const reports = await runReports().catch((e) => ({ made: 0, notified: 0, note: String(e) }));
  const lines = [...(await claimLines()), ...(await managerReminders()), ...(await abnLines()), ...(outreach.sent ? [`Outreach: sent ${outreach.sent} manager emails today.`] : []), ...(reports.made ? [`Suburb reports: made ${reports.made}, emailed ${reports.notified} managers.`] : [])];
  if (lines.length) {
    await sendEmail({
      to: 'hello@cohostcompare.com',
      subject: 'CoHostCompare daily: things that need you',
      text: lines.join('\n'),
      cta: { label: 'Open admin', url: `${siteBase()}/admin` },
    });
  }
  return { ownerReminders: owners, outreach, reports, adminDigest: lines.length > 0 };
}
