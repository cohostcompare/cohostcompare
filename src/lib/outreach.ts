import 'server-only';
import { sign } from '@/lib/claims';
import { sendEmail } from '@/lib/email';
import { outreachReplyTo } from '@/lib/inbound';
import { adminClient } from '@/lib/supabase/server';

/*
 Manager outreach: five short emails inviting unclaimed managers to claim their free profile.
 Spam Act 2003: only to business addresses conspicuously published for that business (source_url recorded),
 sender identified with ABN, and a working unsubscribe honoured immediately. Stops when they claim, reply or unsubscribe.
*/

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
const GAPS_DAYS = [3, 4, 7, 10]; // after emails 1-4
export const DAILY_CAP = Number(process.env.OUTREACH_DAILY_CAP || 30);
/** Master switch: nothing is sent to managers unless OUTREACH_ENABLED=1 in Vercel. */
export const outreachOn = () => process.env.OUTREACH_ENABLED === '1';

export type Ctx = { manager: string; slug: string; first: string | null; homes: number | null; rating: number | null; suburbs: string[]; waiting: number; email: string; source: string; contactId?: string };

export const unsubscribeUrl = (email: string, api = false) => `${BASE}${api ? '/api' : ''}/unsubscribe?e=${encodeURIComponent(email)}&s=${sign(`unsub:${email.toLowerCase()}`)}`;
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

function footer(c: Ctx) {
  return `\n\nCheers,\nBen Deeley\nFounder, CoHostCompare\nhttps://www.cohostcompare.com | hello@cohostcompare.com\n\nYou're getting this because ${c.email} is published on ${host(c.source)} as a contact for ${c.manager}. CoHostCompare is run by Ben Deeley (ABN 52 679 120 059), Sydney NSW. How we build profiles: ${BASE}/managers#why-listed\nTo stop these emails: ${unsubscribeUrl(c.email)}`;
}

export const SEQUENCE: { subject: (c: Ctx) => string; body: (c: Ctx) => string; cta: (c: Ctx) => { label: string; url: string } }[] = [
  {
    subject: (c) => `${c.manager}'s profile on CoHostCompare`,
    body: (c) => `Hi ${c.first || 'there'},\n\nI'm Ben, founder of CoHostCompare, a new free site where property owners in Sydney and Melbourne compare short-term rental managers and request quotes.\n\n${c.manager} already has a profile${c.homes ? `, because you run ${c.homes} homes we track${c.rating ? ` with a ${c.rating.toFixed(2)} ★ average guest rating` : ''}` : ''}. Owners near your homes can see it and ask you for a quote.\n\nClaiming it is free and takes about two minutes. You can add your fees, services, logo and photos, and reply to owners directly. No sales calls, and you only pay a small success fee if an owner accepts your quote. Claim by 31 January and you get Pro free for three months, with no success fees.`,
    cta: (c) => ({ label: 'See your profile', url: `${BASE}/managers/${c.slug}` }),
  },
  {
    subject: (c) => `How owners compare ${c.manager}`,
    body: (c) => `Hi ${c.first || 'there'},\n\nA quick look at how owners use CoHostCompare. They enter their address, see every manager running homes nearby, and compare guest ratings, homes managed and fees side by side. Then they send one request to up to five managers, who each reply in the same quote format.\n\nWe're neutral: no manager can pay to change their rating or place. Managers who've claimed their profile show "Replies on CoHostCompare". Unclaimed profiles show "Not yet on CoHostCompare", and owners are told replies may take longer.\n\nClaiming ${c.manager} takes two minutes.`,
    cta: (c) => ({ label: `Claim ${c.manager}`, url: `${BASE}/claim/${c.slug}` }),
  },
  {
    subject: (c) => (c.waiting ? `An owner is waiting for a quote from ${c.manager}` : `Owners ${c.suburbs[0] ? `in ${c.suburbs[0]} ` : ''}are comparing managers`),
    body: (c) => `Hi ${c.first || 'there'},\n\n${c.waiting ? `${c.waiting === 1 ? 'An owner has' : `${c.waiting} owners have`} asked ${c.manager} for a quote through CoHostCompare. Claim your profile to see the property details and reply.` : `Owners${c.suburbs.length ? ` around ${c.suburbs.slice(0, 3).join(', ')}` : ''} are using CoHostCompare to shortlist managers, check the local rules and estimate what their property could earn.`}\n\nWhen you claim ${c.manager}, quote requests come straight to your inbox and dashboard, with the property details filled in, so you can reply in a few minutes.`,
    cta: (c) => ({ label: c.waiting ? 'See the request' : `Claim ${c.manager}`, url: `${BASE}/claim/${c.slug}` }),
  },
  {
    subject: () => 'Your fees, in your words',
    body: (c) => `Hi ${c.first || 'there'},\n\nRight now ${c.manager}'s profile shows "Fee on request", because we only show fees a manager publishes or sets themselves. Owners compare on fees first, so profiles with a fee range tend to get asked for more quotes.\n\nOnce you claim it, you can set your fee range and terms, add photos of homes you manage, and add your ABN to get a "Verified business" badge.`,
    cta: (c) => ({ label: 'Update your profile', url: `${BASE}/claim/${c.slug}` }),
  },
  {
    subject: (c) => `Last note about ${c.manager}`,
    body: (c) => `Hi ${c.first || 'there'},\n\nThis is my last email about this. ${c.manager}'s profile stays on CoHostCompare either way, and owners can still find it.\n\nIf you'd like to claim it later, the link below works any time. If you'd rather not be listed at all, just reply and I'll remove it.\n\nThanks for reading.`,
    cta: (c) => ({ label: 'Claim when you’re ready', url: `${BASE}/claim/${c.slug}` }),
  },
];

/** Suburbs the manager actually operates in (from their homes), without council names or whole cities; falls back to their stated regions. */
export function localPlaces(localities: string[], cities: string[]) {
  const generic = /\b(council|shire|city of|municipality|greater|region)\b|^(sydney|melbourne|newcastle-maitland)$/i;
  const own = [...new Set(localities.filter((x) => x && !generic.test(x)))].slice(0, 3);
  return own.length ? own : cities.slice(0, 2);
}

async function context(contact: { id?: string; email: string; first_name: string | null; source_url: string; manager_id: string }): Promise<Ctx | null> {
  const db = adminClient();
  const { data: m } = await db.from('managers').select('id, slug, name, claimed, published, cities').eq('id', contact.manager_id).maybeSingle();
  if (!m || !m.published) return null;
  const [{ data: st }, { count: waiting }] = await Promise.all([
    db.from('manager_stats').select('property_count, avg_rating, localities').eq('manager_id', m.id).maybeSingle(),
    db.from('quote_request_managers').select('id', { count: 'exact', head: true }).eq('manager_slug', m.slug).in('status', ['sent', 'viewed']),
  ]);
  return { manager: m.name, slug: m.slug, first: contact.first_name, homes: st?.property_count ?? null, rating: st?.avg_rating != null ? Number(st.avg_rating) : null,
    suburbs: localPlaces((st?.localities as string[] | null) || [], (m as { cities?: string[] }).cities || []), waiting: waiting ?? 0, email: contact.email, source: contact.source_url, contactId: contact.id };
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
export async function notifyUnclaimedOfRequest(slug: string, where: string): Promise<number> {
  if (!outreachOn()) return 0;
  const db = adminClient();
  const { data: m } = await db.from('managers').select('id, name, claimed').eq('slug', slug).maybeSingle();
  if (!m || m.claimed) return 0;
  let sent = 0;
  const { data: contacts } = await db.from('outreach_contacts').select('*').eq('manager_id', m.id).in('status', ['active', 'finished', 'paused']);
  for (const ct of contacts || []) {
    if (await suppressed(ct.email)) continue;
    const c: Ctx = { manager: m.name, slug, first: ct.first_name, homes: null, rating: null, suburbs: [], waiting: 1, email: ct.email, source: ct.source_url };
    await sendEmail({
      to: ct.email, subject: `An owner in ${where} wants a quote from ${m.name}`,
      text: `Hi ${ct.first_name || 'there'},\n\nAn owner in ${where} has asked ${m.name} for a quote through CoHostCompare, the free site where owners compare short-term rental managers.\n\nClaim your free profile to see the property details and reply. It takes about two minutes, and you only pay a small success fee if the owner accepts your quote.${footer(c)}`,
      cta: { label: 'See the request', url: `${BASE}/claim/${slug}` },
      from: 'Ben from CoHostCompare <hello@cohostcompare.com>',
      replyTo: outreachReplyTo(ct.id),
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl(ct.email, true)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
    sent++;
  }
  return sent;
}

export async function unsubscribe(email: string) {
  const e = email.toLowerCase().trim();
  const db = adminClient();
  await db.from('email_suppressions').upsert({ email: e, reason: 'unsubscribed' });
  await db.from('outreach_contacts').update({ status: 'unsubscribed' }).ilike('email', e);
}

/** Sends one sequence email for a real manager to hello@ so it can be checked before going out. */
export async function sendTest(managerId: string, step: number) {
  const c = await context({ email: 'hello@cohostcompare.com', first_name: 'Ben', source_url: 'https://www.cohostcompare.com', manager_id: managerId });
  if (!c) return false;
  const e = SEQUENCE[Math.min(Math.max(step, 0), SEQUENCE.length - 1)];
  return sendEmail({ to: 'hello@cohostcompare.com', subject: `[TEST] ${e.subject(c)}`, text: e.body(c) + footer(c), cta: e.cta(c), from: 'Ben from CoHostCompare <hello@cohostcompare.com>' });
}
