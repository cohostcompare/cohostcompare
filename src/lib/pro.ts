import 'server-only';
import { adminClient } from '@/lib/supabase/server';

/*
 CoHostCompare Pro: optional paid tools for managers. The free profile, quote requests and replies stay free.
 Pro and Enterprise NEVER change search order, ratings, badges owners see, or the quote comparison.
 No billing yet: founding managers (claimed before FOUNDING_DEADLINE) get Pro free for FOUNDING_MONTHS,
 and everyone else can register interest.
*/

export const FOUNDING_DEADLINE = '2027-01-31';
export const FOUNDING_MONTHS = 3;
// Prices live here only. Change them in one place; paying managers get 30 days' notice (terms section 6).
export const PRO_PRICE = 'A$99 a month + GST';
export const PRO_PRICE_SHORT = 'A$99';
export const ENTERPRISE_PRICE = 'from A$400 a month + GST';
export const ENTERPRISE_PRICE_SHORT = 'A$400';
/** Launch pricing: managers who subscribe during launch keep their price for this long. */
export const PRICE_LOCK_MONTHS = 12;
export const PRO_FOLLOW_LIMIT = 5; // extra report areas a Pro manager can follow
export const foundingDeadlineText = () => new Date(`${FOUNDING_DEADLINE}T12:00:00+10:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

export type Feature = { title: string; body: string; live: boolean };

export const PRO_FEATURES: Feature[] = [
  { title: 'Benchmarks', body: 'How your fees, guest ratings, homes and reply speed compare with other managers covering the same areas.', live: true },
  { title: 'Owner demand', body: 'How many owners searched in each of your postcodes over the last 30 days, and which areas are growing.', live: true },
  { title: 'Quote results', body: 'Your quote win rate and how your quotes compare on fees, without showing any other manager’s quote.', live: true },
  { title: 'More photos', body: 'Up to 24 photos on your profile instead of 12.', live: true },
  { title: 'Suburb reports', body: 'Quarterly short-stay market reports for your areas, plus up to 5 more you choose: seasonality, nightly rates and revenue by bedrooms, demand and how fees compare, with every past report kept.', live: true },
  { title: 'SMS alerts', body: 'A text message the moment an owner asks you for a quote or accepts yours.', live: true },
  { title: 'Saved replies', body: 'Reusable quote notes and message templates.', live: false },
];

export const ENTERPRISE_FEATURES: Feature[] = [
  { title: 'Every region, one account', body: 'All your offices, brands and regions under one login, with each quote request routed to the right regional team.', live: false },
  { title: 'Team roles', body: 'Unlimited team logins, with regional managers who see only their own areas.', live: false },
  { title: 'API and webhooks', body: 'Quote requests, messages and quote outcomes sent straight into your CRM or property management system, or through Zapier.', live: false },
  { title: 'Portfolio insights', body: 'Benchmarks and owner demand across every region side by side, with CSV exports.', live: false },
  { title: 'Suburb reports for every region', body: 'Quarterly reports for every area we cover, not just five extra.', live: true },
  { title: 'Regional quote templates', body: 'Different standard fees, inclusions and terms for each region, ready to send.', live: false },
  { title: 'Priority support', body: 'A named contact, help setting up every profile, and a quarterly review of your results.', live: false },
];

export type Plan = 'free' | 'pro' | 'enterprise';
type PlanRow = { plan?: string | null; pro_until?: string | null };
const live = (until?: string | null) => !until || new Date(until).getTime() > Date.now();

/** The plan a manager has right now. Founding managers have pro_until set and no plan. */
export function planOf(m: PlanRow | null | undefined): Plan {
  if (!m) return 'free';
  if (m.plan === 'enterprise' && live(m.pro_until)) return 'enterprise';
  if (m.plan === 'pro' && live(m.pro_until)) return 'pro';
  if (m.pro_until && new Date(m.pro_until).getTime() > Date.now()) return 'pro';
  return 'free';
}
export const isPro = (m: PlanRow | null | undefined) => planOf(m) !== 'free';
export const planName = (p: Plan) => ({ free: 'Free', pro: 'Pro', enterprise: 'Enterprise' })[p];

/** Plan columns for a set of manager ids (empty map if SQL 012/014 haven't been run). */
export async function plansFor(ids: string[]) {
  const out = new Map<string, PlanRow & { pro_note?: string | null }>();
  if (!ids.length) return out;
  let { data, error } = await adminClient().from('managers').select('id, plan, pro_until, pro_note').in('id', ids);
  if (error) ({ data } = await adminClient().from('managers').select('id, pro_until, pro_note').in('id', ids) as unknown as { data: typeof data });
  for (const r of data || []) out.set(r.id, r);
  return out;
}

/** Founding offer: Pro free for FOUNDING_MONTHS from the day a manager claims, if they claim before the deadline. Needs SQL 012. */
export async function grantFoundingPro(managerId: string) {
  if (Date.now() > new Date(`${FOUNDING_DEADLINE}T23:59:59+11:00`).getTime()) return;
  const until = new Date();
  until.setMonth(until.getMonth() + FOUNDING_MONTHS);
  await adminClient().from('managers').update({ pro_until: until.toISOString(), pro_note: 'founding' }).eq('id', managerId).is('pro_until', null);
}

/** Records interest in Pro, a suburb report or partnering. Returns false only on a real error. */
export async function registerInterest(row: { kind: 'pro' | 'report' | 'partner' | 'enterprise'; email: string; name?: string | null; manager_id?: string | null; area?: string | null; note?: string | null }) {
  const { error } = await adminClient().from('interest_signups').insert({ ...row, email: row.email.trim().toLowerCase() });
  if (error && error.code !== '23505') { console.error('interest', error); return false; }
  return true;
}

export const FREE_PHOTOS = 12;
export const PRO_PHOTOS = 24;

/** Photo allowance for a manager profile (Pro gets more). Falls back to the free limit if SQL 012 isn't run. */
export async function photoLimit(managerId: string) {
  return isPro((await plansFor([managerId])).get(managerId)) ? PRO_PHOTOS : FREE_PHOTOS;
}
