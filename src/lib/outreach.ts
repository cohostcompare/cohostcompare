import 'server-only';
import { sign } from '@/lib/claims';
import { sendEmail } from '@/lib/email';
import { outreachReplyTo } from '@/lib/inbound';
import { FREE_ACCEPTS_PER_MONTH, SUCCESS_FEE_TEXT } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';

/*
 Manager outreach: five short emails inviting unclaimed managers to claim their free profile.
 Spam Act 2003: only to business addresses conspicuously published for that business (source_url recorded),
 sender identified with ABN, and a working unsubscribe honoured immediately. Stops when they claim, reply or unsubscribe.
*/

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
const GAPS_DAYS = [3, 4, 7, 10]; // after emails 1-4
export const DAILY_CAP = Number(process.env.OUTREACH_DAILY_CAP || 30);
/*
 Two switches:
 - The cold outreach sequence (5 emails inviting managers to claim) starts on OUTREACH_START (Ben: Tuesday 6 Oct 2026,
   after the long weekend; the daily cron runs about 9am Sydney). OUTREACH_ENABLED=0 in Vercel stops it at any time; =1 forces it on.
 - Request emails ("an owner wants a quote from you") to unclaimed managers are on now: they're triggered by a real
   owner's request. REQUEST_EMAILS=0 in Vercel turns them off.
*/
export const OUTREACH_START = '2026-10-05T21:00:00Z'; // 8am Tuesday 6 October, Sydney (AEDT)
export const outreachOn = () => {
  const v = (process.env.OUTREACH_ENABLED || '').trim();
  if (v === '0') return false;
  if (v === '1') return true;
  return Date.now() >= new Date(OUTREACH_START).getTime();
};
export const requestEmailsOn = () => (process.env.REQUEST_EMAILS || '').trim() !== '0';

export type Ctx = { manager: string; slug: string; first: string | null; homes: number | null; rating: number | null; feeMin?: number | null; feeMax?: number | null; suburbs: string[]; waiting: number; email: string; source: string; contactId?: string };

export const unsubscribeUrl = (email: string, api = false) => `${BASE}${api ? '/api' : ''}/unsubscribe?e=${encodeURIComponent(email)}&s=${sign(`unsub:${email.toLowerCase()}`)}`;
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

function footer(c: Ctx) {
  return `\n\nCheers,\nBen Deeley\nFounder, CoHostCompare\nhttps://www.cohostcompare.com | hello@cohostcompare.com\n\nYou're getting this because ${c.email} is published on ${host(c.source)} as a contact for ${c.manager}. CoHostCompare is run by Ben Deeley (ABN 52 679 120 059), Sydney NSW. How we build profiles: ${BASE}/managers#why-listed\nTo stop these emails: ${unsubscribeUrl(c.email)}`;
}

/** Footer for the one transactional notice (an owner asked for a quote) sent to an address that has unsubscribed: sender details only. */
function unsubscribedFooter(c: Ctx) {
  return `\n\nCheers,\nBen Deeley\nFounder, CoHostCompare\nhttps://www.cohostcompare.com | hello@cohostcompare.com\n\nYou've unsubscribed from our other emails, so this is the only kind you'll get: a notice when an owner asks ${c.manager} for a quote. We send it because ${c.email} is published on ${host(c.source)} as a contact for ${c.manager}. If you'd rather not be listed at all, reply and we'll remove the profile. CoHostCompare is run by Ben Deeley (ABN 52 679 120 059), Sydney NSW.`;
}

export const SEQUENCE: { subject: (c: Ctx) => string; body: (c: Ctx) => string; cta: (c: Ctx) => { label: string; url: string } }[] = [
  {
    subject: (c) => `${c.manager}'s profile on CoHostCompare`,
    body: (c) => `Hi ${c.first || 'there'},\n\nI'm Ben, founder of CoHostCompare, a new free site where property owners across NSW and Victoria compare short-term rental managers and request quotes.\n\n${c.manager} already has a profile${c.homes ? `, because you run ${c.homes} homes we track${c.rating ? ` with a ${c.rating.toFixed(2)} ★ average guest rating` : ''}` : ''}. Owners near your homes can see it and ask you for a quote.\n\nClaiming it is free and takes about two minutes. You can add your fees, services, logo and photos, and reply to owners directly. No sales calls, and no fees for your first ${FREE_ACCEPTS_PER_MONTH} new clients each month, then ${SUCCESS_FEE_TEXT} per client you win, or Pro. Claim by 31 January and you get Pro free for three months.`,
    cta: (c) => ({ label: 'See your profile', url: `${BASE}/managers/${c.slug}` }),
  },
  {
    subject: (c) => `How owners compare ${c.manager}`,
    body: (c) => `Hi ${c.first || 'there'},\n\nA quick look at how owners use CoHostCompare. They enter their address, see every manager running homes nearby, and compare guest ratings, homes managed and fees side by side. Then they send one request to up to five managers, who each reply in the same quote format.\n\nWe're unbiased: no manager can pay to change their rating or place. Managers who've claimed their profile show "Replies on CoHostCompare". Unclaimed profiles show "Not yet on CoHostCompare", and owners are told replies may take longer.\n\nClaiming ${c.manager} takes two minutes.`,
    cta: (c) => ({ label: `Claim ${c.manager}`, url: `${BASE}/claim/${c.slug}` }),
  },
  {
    subject: (c) => (c.waiting ? `An owner is waiting for a quote from ${c.manager}` : `Owners ${c.suburbs[0] ? `in ${c.suburbs[0]} ` : ''}are comparing managers`),
    body: (c) => `Hi ${c.first || 'there'},\n\n${c.waiting ? `${c.waiting === 1 ? 'An owner has' : `${c.waiting} owners have`} asked ${c.manager} for a quote through CoHostCompare. Claim your profile to see the property details and reply.` : `Owners${c.suburbs.length ? ` around ${c.suburbs.slice(0, 3).join(', ')}` : ''} are using CoHostCompare to shortlist managers, check the local rules and estimate what their property could earn.`}\n\nWhen you claim ${c.manager}, quote requests come straight to your inbox and dashboard, with the property details filled in, so you can reply in a few minutes.`,
    cta: (c) => ({ label: c.waiting ? 'See the request' : `Claim ${c.manager}`, url: `${BASE}/claim/${c.slug}` }),
  },
  {
    subject: () => 'Your fees, in your words',
    body: (c) => `Hi ${c.first || 'there'},\n\n${c.feeMin != null
      ? `Right now ${c.manager}'s profile shows a management fee of ${feeText(c.feeMin, c.feeMax ?? null)}, as published on your website. If that's right, great. If it's out of date or needs context, you can correct it once you claim the profile.`
      : `Right now ${c.manager}'s profile shows "Fee on request", because we only show fees a manager publishes or sets themselves.`} Owners compare on fees first, so profiles with a clear fee range tend to get asked for more quotes.\n\nOnce you claim it, you can ${c.feeMin != null ? 'confirm or change your fee range and terms' : 'set your fee range and terms'}, add photos of homes you manage, and add your ABN to get a "Verified business" badge.`,
    cta: (c) => ({ label: 'Update your profile', url: `${BASE}/claim/${c.slug}` }),
  },
  {
    subject: (c) => `Last note about ${c.manager}`,
    body: (c) => `Hi ${c.first || 'there'},\n\nThis is my last email about this. ${c.manager}'s profile stays on CoHostCompare either way, and owners can still find it.\n\nIf you'd like to claim it later, the link below works any time. If you'd rather not be listed at all, just reply and I'll remove it.\n\nThanks for reading.`,
    cta: (c) => ({ label: 'Claim when you’re ready', url: `${BASE}/claim/${c.slug}` }),
  },
];

/** "18%" or "15–20%". */
const feeText = (min: number, max: number | null) => (max != null && max !== min ? `${min}–${max}%` : `${min}%`);

/** Suburbs the manager actually operates in (from their homes), without council names or whole cities; falls back to their stated regions. */
export function localPlaces(localities: string[], cities: string[]) {
  const generic = /\b(council|shire|city of|municipality|greater|region)\b|^(sydney|melbourne|newcastle-maitland)$/i;
  const own = [...new Set(localities.filter((x) => x && !generic.test(x)))].slice(0, 3);
  return own.length ? own : cities.slice(0, 2);
}

async function context(contact: { id?: string; email: string; first_name: string | null; source_url: string; manager_id: string }): Promise<Ctx | null> {
  const db = adminClient();
  const { data: m } = await db.from('managers').select('id, slug, name, claimed, published, cities, fee_min, fee_max').eq('id', contact.manager_id).maybeSingle();
  if (!m || !m.published) return null;
  const [{ data: st }, { count: waiting }] = await Promise.all([
    db.from('manager_stats').select('property_count, avg_rating, localities').eq('manager_id', m.id).maybeSingle(),
    db.from('quote_request_managers').select('id', { count: 'exact', head: true }).eq('manager_slug', m.slug).in('status', ['sent', 'viewed']),
  ]);
  return { manager: m.name, slug: m.slug, first: contact.first_name, homes: st?.property_count ?? null, rating: st?.avg_rating != null ? Number(st.avg_rating) : null,
    feeMin: m.fee_min != null ? Number(m.fee_min) : null, feeMax: m.fee_max != null ? Number(m.fee_max) : null,
    suburbs: localPlaces((st?.localities as string[] | null) || [], (m as { cities?: string[] }).cities || []), waiting: waiting ?? 0, email: contact.email, source: contact.source_url, contactId: contact.id };
}

/** Requests before this were tests (Ben, 2 Oct 2026): never emailed to unclaimed managers or flagged as "not told". 3pm Sydney. */
export const CATCHUP_FROM = '2026-10-02T05:00:00Z';

export type Reach = 'ok' | 'no-email' | 'unsubscribed';
/** Contact statuses that still get the transactional "an owner wants a quote" notice. Unsubscribing stops the outreach sequence, not that notice. */
const REQUEST_STATUSES = ['active', 'finished', 'paused', 'unsubscribed'];
/**
 * For unclaimed managers: can we email them about a request? 'no-email' = no contact on file (bounced addresses don't count).
 * 'unsubscribed' is kept in the type for older admin copy but is no longer returned: the request notice is transactional and still goes.
 */
export async function unclaimedReach(slugs: string[]): Promise<Map<string, Reach>> {
  const out = new Map<string, Reach>();
  if (!slugs.length) return out;
  const db = adminClient();
  const { data: ms } = await db.from('managers').select('id, slug').in('slug', slugs);
  const ids = (ms || []).map((m) => m.id);
  const { data: cs } = ids.length ? await db.from('outreach_contacts').select('manager_id, email').in('manager_id', ids).in('status', REQUEST_STATUSES) : { data: [] };
  for (const m of ms || []) out.set(m.slug, (cs || []).some((c) => c.manager_id === m.id) ? 'ok' : 'no-email');
  return out;
}

/** Open requests (last 30 days) where an unclaimed manager hasn't been told, with each reason. */
export async function unreachedThreads(): Promise<{ manager: string; reason: 'no-email' | 'unsubscribed' | 'retrying' }[]> {
  const db = adminClient();
  const { data, error } = await db.from('quote_request_managers').select('manager_slug, manager_name').in('status', ['sent', 'viewed']).is('unclaimed_notified_at', null).neq('manager_slug', 'test-profile').gte('created_at', [new Date(Date.now() - 30 * 86400e3).toISOString(), CATCHUP_FROM].sort()[1]).limit(500);
  if (error || !data?.length) return [];
  const slugs = [...new Set(data.map((t) => t.manager_slug))];
  const { data: ms } = await db.from('managers').select('slug').in('slug', slugs).eq('claimed', false);
  const un = new Set((ms || []).map((m) => m.slug));
  const reach = await unclaimedReach([...un]);
  return data.filter((t) => un.has(t.manager_slug)).map((t) => { const r = reach.get(t.manager_slug) || 'no-email'; return { manager: t.manager_name, reason: r === 'ok' ? 'retrying' as const : r }; });
}

export type OutreachStats = { contacted: number; emails: number; replied: number; claimed: number; unsubscribed: number; bounced: number; queued: number; finished: number; sentWeek: number };
/** How the outreach sequence is doing (contacts that have had at least one email). */
export async function outreachStats(): Promise<OutreachStats> {
  const { data } = await adminClient().from('outreach_contacts').select('manager_id, step, status, last_sent_at, managers(claimed)').limit(5000);
  const rows = (data || []) as unknown as { manager_id: string; step: number; status: string; last_sent_at: string | null; managers: { claimed: boolean } | { claimed: boolean }[] | null }[];
  const sent = rows.filter((r) => r.step > 0);
  const claimedMgrs = new Set(sent.filter((r) => (Array.isArray(r.managers) ? r.managers[0] : r.managers)?.claimed || r.status === 'claimed').map((r) => r.manager_id));
  const weekAgo = Date.now() - 7 * 86400e3;
  return {
    contacted: new Set(sent.map((r) => r.manager_id)).size,
    emails: sent.reduce((s, r) => s + r.step, 0),
    replied: sent.filter((r) => r.status === 'replied').length,
    claimed: claimedMgrs.size,
    unsubscribed: sent.filter((r) => r.status === 'unsubscribed').length,
    bounced: sent.filter((r) => r.status === 'bounced').length,
    queued: rows.filter((r) => r.step === 0 && r.status === 'active').length,
    finished: sent.filter((r) => r.status === 'finished').length,
    sentWeek: sent.filter((r) => r.last_sent_at && new Date(r.last_sent_at).getTime() > weekAgo).length,
  };
}

export async function suppressed(email: string) {
  const { data } = await adminClient().from('email_suppressions').select('email').eq('email', email.toLowerCase()).maybeSingle();
  return Boolean(data);
}

async function send(c: Ctx, i: number) {
  const e = SEQUENCE[i];
  return sendEmail({
    to: c.email, subject: e.subject(c), text: e.body(c) + footer(c), cta: e.cta(c),
    from: 'Ben from CoHostCompare <hello@cohostcompare.com>',
    replyTo: c.contactId ? outreachReplyTo(c.contactId) : undefined,
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl(c.email, true)}>, <mailto:hello@cohostcompare.com?subject=unsubscribe>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  });
}

/** Sends the next due email to up to `limit` contacts (respecting the daily cap). */
export async function sendOutreachBatch(limit = DAILY_CAP) {
  if (!outreachOn()) return { sent: 0, note: 'Outreach is paused' };
  const db = adminClient();
  const since = new Date(Date.now() - 86400e3).toISOString();
  const { count: sentToday } = await db.from('outreach_contacts').select('id', { count: 'exact', head: true }).gte('last_sent_at', since);
  const room = Math.max(0, Math.min(limit, DAILY_CAP - (sentToday ?? 0)));
  if (!room) return { sent: 0, note: 'Daily cap reached' };
  const { data: due, error } = await db.from('outreach_contacts').select('*').eq('status', 'active').lte('next_send_at', new Date().toISOString()).order('next_send_at').limit(room * 2);
  if (error) return { sent: 0, note: error.message };
  let sent = 0;
  for (const ct of due || []) {
    if (sent >= room) break;
    const { data: m } = await db.from('managers').select('claimed').eq('id', ct.manager_id).maybeSingle();
    if (m?.claimed) { await db.from('outreach_contacts').update({ status: 'claimed' }).eq('id', ct.id); continue; }
    if (await suppressed(ct.email)) { await db.from('outreach_contacts').update({ status: 'unsubscribed' }).eq('id', ct.id); continue; }
    if (ct.step >= SEQUENCE.length) { await db.from('outreach_contacts').update({ status: 'finished' }).eq('id', ct.id); continue; }
    const c = await context(ct);
    if (!c) { await db.from('outreach_contacts').update({ status: 'paused' }).eq('id', ct.id); continue; }
    const ok = await send(c, ct.step);
    if (!ok) continue;
    const step = ct.step + 1;
    await db.from('outreach_contacts').update({
      step, last_sent_at: new Date().toISOString(), status: step >= SEQUENCE.length ? 'finished' : 'active',
      next_send_at: new Date(Date.now() + (GAPS_DAYS[step - 1] ?? 7) * 86400e3).toISOString(),
    }).eq('id', ct.id);
    sent++;
  }
  return { sent };
}

/** When an owner requests a quote from an unclaimed manager, tell that manager's outreach contacts straight away. */
export async function notifyUnclaimedOfRequest(slug: string, where: string, threadId?: string): Promise<number> {
  if (!requestEmailsOn()) return 0;
  const db = adminClient();
  const { data: m } = await db.from('managers').select('id, name, claimed').eq('slug', slug).maybeSingle();
  if (!m || m.claimed) return 0;
  let sent = 0;
  // Transactional (a real owner asked for this manager), so it goes even to addresses that unsubscribed from the outreach sequence, with a plain sender-only footer.
  const { data: contacts } = await db.from('outreach_contacts').select('*').eq('manager_id', m.id).in('status', REQUEST_STATUSES);
  for (const ct of contacts || []) {
    const off = ct.status === 'unsubscribed' || await suppressed(ct.email);
    const c: Ctx = { manager: m.name, slug, first: ct.first_name, homes: null, rating: null, feeMin: null, feeMax: null, suburbs: [], waiting: 1, email: ct.email, source: ct.source_url };
    const ok = await sendEmail({
      to: ct.email, subject: `An owner in ${where} wants a quote from ${m.name}`,
      text: `Hi ${ct.first_name || 'there'},\n\nAn owner in ${where} has asked ${m.name} for a quote through CoHostCompare, the free site where owners compare short-term rental managers.\n\nClaim your free profile to see the property details and reply. It takes about two minutes, and it's free.${off ? unsubscribedFooter(c) : footer(c)}`,
      cta: { label: 'See the request', url: `${BASE}/claim/${slug}` },
      from: 'Ben from CoHostCompare <hello@cohostcompare.com>',
      replyTo: outreachReplyTo(ct.id),
      ...(off ? {} : { headers: { 'List-Unsubscribe': `<${unsubscribeUrl(ct.email, true)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }),
    });
    if (ok) sent++;
  }
  if (sent && threadId) await db.from('quote_request_managers').update({ unclaimed_notified_at: new Date().toISOString() }).eq('id', threadId).then(() => {}, () => {}); // needs 022
  return sent;
}

export async function unsubscribe(email: string) {
  const e = email.toLowerCase().trim();
  const db = adminClient();
  await db.from('email_suppressions').upsert({ email: e, reason: 'unsubscribed' });
  await db.from('outreach_contacts').update({ status: 'unsubscribed' }).ilike('email', e);
  await db.from('guide_signups').update({ consent: false, next_at: null }).ilike('email', e).then(() => {}, () => {});
}

/** Sends one sequence email for a real manager to hello@ so it can be checked before going out. */
export async function sendTest(managerId: string, step: number) {
  const c = await context({ email: 'hello@cohostcompare.com', first_name: 'Ben', source_url: 'https://www.cohostcompare.com', manager_id: managerId });
  if (!c) return false;
  const e = SEQUENCE[Math.min(Math.max(step, 0), SEQUENCE.length - 1)];
  return sendEmail({ to: 'hello@cohostcompare.com', subject: `[TEST] ${e.subject(c)}`, text: e.body(c) + footer(c), cta: e.cta(c), from: 'Ben from CoHostCompare <hello@cohostcompare.com>' });
}
