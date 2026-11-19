import 'server-only';
import { sign, verify } from '@/lib/claims';
import { sendEmail } from '@/lib/email';
import { richHtml, richText, type Rich } from '@/lib/emailRich';
import { outreachReplyTo } from '@/lib/inbound';
import { localPlaces, outreachOn, suppressed, unsubscribeUrl } from '@/lib/outreach';
import { adminClient } from '@/lib/supabase/server';

/*
 After the five-email outreach sequence (Ben, 19 Nov 2026). No second drip: the last sequence email said it was the last
 about claiming, so these only go out when there is something specific to say, and never more than one a month.
 1. Fee question, once, 14+ days after the sequence ended: tap a figure, confirm on /fee/[contact] with no account.
    Managers whose fee came from their website get "is it still X?" instead. A confirmed fee sets managers.fee_confirmed_at.
 2. Demand note, at most three, 30+ days apart, only when the profile was shown in MIN_SEARCHES or more owner searches
    in the last 30 days: the real figure, and the claim link.
 Stops for good on claim, reply, unsubscribe or bounce (the contact's status), like the sequence. SQL 037.
*/
const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
export const FOLLOWUP_CAP = Number(process.env.FOLLOWUP_DAILY_CAP || 20);
const WAIT_DAYS = 14, GAP_DAYS = 30, MIN_SEARCHES = 5, MAX_DEMAND = 3;
const QUICK = [15, 18, 20, 22];

export const feeSig = (contactId: string) => sign(`fee:${contactId}`);
export const feeSigOk = (contactId: string, s: string) => verify(`fee:${contactId}`, s);
export const feeUrl = (contactId: string, f?: number | null, t?: number | null) => `${BASE}/fee/${contactId}?s=${feeSig(contactId)}${f != null ? `&f=${f}` : ''}${t != null && t !== f ? `&t=${t}` : ''}`;
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const withUtm = (url: string, campaign: string) => { const u = new URL(url); u.searchParams.set('utm_source', 'outreach'); u.searchParams.set('utm_medium', 'email'); u.searchParams.set('utm_campaign', campaign); return u.toString(); };
const feeText = (min: number, max: number | null) => (max != null && max !== min ? `${min}–${max}%` : `${min}%`);

export type FollowCtx = { contactId: string; email: string; first: string | null; source: string; manager: string; slug: string; homes: number | null; rating: number | null; feeMin: number | null; feeMax: number | null; places: string[]; searches: number };

const footer = (c: FollowCtx) => [
  `You're getting this because ${c.email} is published on ${host(c.source)} as a contact for ${c.manager}. CoHostCompare (ABN 52 679 120 059), Sydney NSW. How we build profiles: ${BASE}/managers#why-listed`,
  `Stop these emails: ${unsubscribeUrl(c.email)}`,
];
const stats = (c: FollowCtx) => [
  ...(c.searches > 0 ? [{ value: String(c.searches), label: 'Owner searches' }] : []),
  ...(c.homes ? [{ value: String(c.homes), label: 'Homes we track' }] : []),
  ...(c.rating ? [{ value: `${c.rating.toFixed(2)} ★`, label: 'Guest rating' }] : []),
];

/** "What's your fee?" for a profile showing On request. */
export function feeAsk(c: FollowCtx): { subject: string; rich: Rich } {
  const around = c.places.length ? ` around ${c.places.slice(0, 2).join(' and ')}` : '';
  return {
    subject: `One question about ${c.manager}: what's your fee?`,
    rich: {
      preheader: 'Tap a figure and confirm it. No account, about 20 seconds.',
      label: 'One question', heading: `What does ${c.manager} charge?`,
      paras: [
        `Hi ${c.first || 'there'},`,
        'Our last email was the last one asking you to claim your profile, and it was. This is one question instead.',
        `Owners comparing managers${around} look at the fee first. ${c.manager} shows “On request”, because we only show a fee a manager publishes or gives us.${c.searches >= MIN_SEARCHES ? ` Your profile was shown in ${c.searches} owner searches in the last 30 days.` : ''}`,
        'Tap the closest figure, then confirm or adjust it on the next screen. No account or password.',
      ],
      stats: stats(c),
      chips: { title: 'Your management fee, as a share of booking income', items: [...QUICK.map((f) => ({ label: `${f}%`, url: withUtm(feeUrl(c.contactId, f), 'fee') })), { label: 'Other', url: withUtm(feeUrl(c.contactId), 'fee') }] },
      after: ['Easier to reply? Just answer this email with your fee and we’ll add it. If you’d rather not show one, do nothing and it stays “On request”.'],
      footer: footer(c),
    },
  };
}

/** "Is it still X?" for a fee we took from the manager's own website. */
export function feeConfirm(c: FollowCtx): { subject: string; rich: Rich } {
  const fee = feeText(c.feeMin!, c.feeMax);
  return {
    subject: `Is ${fee} still right for ${c.manager}?`,
    rich: {
      preheader: 'One tap to confirm it, or correct it. No account needed.',
      label: 'Quick check', heading: `Is ${fee} still your fee?`,
      paras: [
        `Hi ${c.first || 'there'},`,
        `${c.manager}'s profile shows a management fee of ${fee}, taken from your website. Owners see it marked as unconfirmed.${c.searches >= MIN_SEARCHES ? ` Your profile was shown in ${c.searches} owner searches in the last 30 days.` : ''}`,
        'Confirm it in one tap, or change it on the same screen if it’s out of date. No account or password.',
      ],
      stats: stats(c),
      cta: { label: `Yes, confirm ${fee}`, url: withUtm(feeUrl(c.contactId, c.feeMin, c.feeMax), 'fee-confirm') },
      after: ['Easier to reply? Answer this email with the right figure and we’ll update it.'],
      footer: footer(c),
    },
  };
}

/** The monthly note: how often owners saw this profile, only when it's a real number. */
export function demandNote(c: FollowCtx): { subject: string; rich: Rich } {
  const around = c.places.length ? ` around ${c.places.slice(0, 3).join(', ')}` : '';
  return {
    subject: `${c.manager} was shown in ${c.searches} owner searches this month`,
    rich: {
      preheader: 'Owners searching by address saw your profile. Here are the figures.',
      label: 'Last 30 days', heading: `${c.searches} owner searches showed ${c.manager}`,
      paras: [
        `Hi ${c.first || 'there'},`,
        `In the last 30 days, owners searching for a short-term rental manager${around} saw ${c.manager} in their results ${c.searches} times.`,
        'They can already ask you for a quote. Claim the profile and requests arrive with the property details filled in, so a reply takes a few minutes. It’s free, with no sales calls.',
      ],
      stats: stats(c),
      cta: { label: `Claim ${c.manager}`, url: withUtm(`${BASE}/claim/${c.slug}`, 'demand') },
      after: ['We send this at most once a month, and only when there’s something to report.'],
      footer: footer(c),
    },
  };
}

async function searchCounts(ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!ids.length) return out;
  const since = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  const { data } = await adminClient().from('manager_events').select('manager_id, count').eq('kind', 'search').in('manager_id', ids).gte('day', since).limit(20000);
  for (const r of data || []) out.set(r.manager_id, (out.get(r.manager_id) || 0) + Number(r.count || 0));
  return out;
}

type Contact = { id: string; manager_id: string; email: string; first_name: string | null; source_url: string; last_sent_at: string | null; fee_asked_at: string | null; demand_sent_at: string | null; demand_count: number };

async function deliver(c: FollowCtx, e: { subject: string; rich: Rich }, test = false) {
  return sendEmail({
    to: test ? 'hello@cohostcompare.com' : c.email, subject: `${test ? '[TEST] ' : ''}${e.subject}`, text: richText(e.rich), html: richHtml(e.rich),
    from: 'CoHostCompare <hello@cohostcompare.com>',
    replyTo: test ? undefined : outreachReplyTo(c.contactId),
    ...(test ? {} : { headers: { 'List-Unsubscribe': `<${unsubscribeUrl(c.email, true)}>, <mailto:hello@cohostcompare.com?subject=unsubscribe>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }),
  });
}

/** Sends today's follow-ups (daily cron, after the sequence batch). One email per manager per run. */
export async function followUpBatch(limit = FOLLOWUP_CAP) {
  if (!outreachOn()) return { sent: 0, note: 'Outreach is paused' };
  const db = adminClient();
  const now = Date.now(), iso = (d: number) => new Date(now - d * 86400e3).toISOString();
  const since = new Date(now - 20 * 3600e3).toISOString();
  const [{ count: a }, { count: b }] = await Promise.all([
    db.from('outreach_contacts').select('id', { count: 'exact', head: true }).gte('fee_asked_at', since),
    db.from('outreach_contacts').select('id', { count: 'exact', head: true }).gte('demand_sent_at', since),
  ]);
  const room = Math.max(0, Math.min(limit, FOLLOWUP_CAP - (a ?? 0) - (b ?? 0)));
  if (!room) return { sent: 0, note: 'Daily cap reached' };
  const { data, error } = await db.from('outreach_contacts').select('id, manager_id, email, first_name, source_url, last_sent_at, fee_asked_at, demand_sent_at, demand_count').eq('status', 'finished').lte('last_sent_at', iso(WAIT_DAYS)).order('last_sent_at').limit(400);
  if (error) return { sent: 0, note: error.message };
  const contacts = (data || []) as Contact[];
  const ids = [...new Set(contacts.map((c) => c.manager_id))];
  const [{ data: ms }, { data: st }, searches] = await Promise.all([
    db.from('managers').select('id, slug, name, claimed, published, cities, fee_min, fee_max, fee_confirmed_at').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
    db.from('manager_stats').select('manager_id, property_count, avg_rating, localities').in('manager_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
    searchCounts(ids),
  ]);
  const mById = new Map((ms || []).map((m) => [m.id, m]));
  const sById = new Map((st || []).map((s) => [s.manager_id, s]));
  const done = new Set<string>();
  let sent = 0, fee = 0, demand = 0;
  for (const ct of contacts) {
    if (sent >= room) break;
    const m = mById.get(ct.manager_id);
    if (!m || !m.published || done.has(m.id)) continue;
    if (m.claimed) { await db.from('outreach_contacts').update({ status: 'claimed' }).eq('id', ct.id); continue; }
    if (await suppressed(ct.email)) { await db.from('outreach_contacts').update({ status: 'unsubscribed' }).eq('id', ct.id); continue; }
    const s = sById.get(m.id);
    const c: FollowCtx = { contactId: ct.id, email: ct.email, first: ct.first_name, source: ct.source_url, manager: m.name, slug: m.slug,
      homes: s?.property_count ?? null, rating: s?.avg_rating != null ? Number(s.avg_rating) : null,
      feeMin: m.fee_min != null ? Number(m.fee_min) : null, feeMax: m.fee_max != null ? Number(m.fee_max) : null,
      places: localPlaces((s?.localities as string[] | null) || [], (m.cities as string[] | null) || []), searches: searches.get(m.id) || 0 };
    const last = Math.max(...[ct.last_sent_at, ct.fee_asked_at, ct.demand_sent_at].map((x) => (x ? new Date(x).getTime() : 0)));
    if (!ct.fee_asked_at && !m.fee_confirmed_at) {
      if (!(await deliver(c, c.feeMin == null ? feeAsk(c) : feeConfirm(c)))) continue;
      await db.from('outreach_contacts').update({ fee_asked_at: new Date().toISOString() }).eq('manager_id', m.id).is('fee_asked_at', null);
      fee++;
    } else if (ct.demand_count < MAX_DEMAND && c.searches >= MIN_SEARCHES && now - last >= GAP_DAYS * 86400e3) {
      if (!(await deliver(c, demandNote(c)))) continue;
      await db.from('outreach_contacts').update({ demand_sent_at: new Date().toISOString(), demand_count: ct.demand_count + 1 }).eq('id', ct.id);
      demand++;
    } else continue;
    done.add(m.id); sent++;
  }
  return { sent, note: `${fee} fee question${fee === 1 ? '' : 's'}, ${demand} demand note${demand === 1 ? '' : 's'}` };
}

/** Everything the fee page needs for a signed link, or null when the link is bad or the profile is gone. */
export async function feeContact(contactId: string, s: string) {
  if (!/^[0-9a-f-]{36}$/.test(contactId) || !feeSigOk(contactId, s)) return null;
  const db = adminClient();
  const { data: ct } = await db.from('outreach_contacts').select('id, manager_id, email').eq('id', contactId).maybeSingle();
  if (!ct) return null;
  const { data: m } = await db.from('managers').select('id, slug, name, claimed, published, fee_min, fee_max').eq('id', ct.manager_id).maybeSingle();
  if (!m || !m.published) return null;
  return { contactId: ct.id as string, email: ct.email as string, manager: m as { id: string; slug: string; name: string; claimed: boolean; fee_min: number | null; fee_max: number | null } };
}
