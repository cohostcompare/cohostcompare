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
export const PRO_PRICE = 'A$49 a month + GST';
export const PRO_PRICE_SHORT = 'A$49';
export const ENTERPRISE_PRICE = 'from A$249 a month + GST';
export const ENTERPRISE_PRICE_SHORT = 'A$249';
export const foundingDeadlineText = () => new Date(`${FOUNDING_DEADLINE}T12:00:00+10:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

export type Feature = { title: string; body: string; live: boolean };

export const PRO_FEATURES: Feature[] = [
  { title: 'Benchmarks', body: 'How your fees, guest ratings, homes and reply speed compare with other managers covering the same areas.', live: true },
  { title: 'Owner demand', body: 'How many owners searched in each of your postcodes over the last 30 days, and which areas are growing.', live: true },
  { title: 'Quote results', body: 'Your quote win rate and how your quotes compare on fees, without showing any other manager’s quote.', live: true },
  { title: 'More photos', body: 'Up to 24 photos on your profile instead of 12.', live: true },
  { title: 'Suburb reports', body: 'Short-stay market reports for your postcodes: seasonality, nightly rates by bedrooms and how fees compare.', live: false },
  { title: 'SMS alerts', body: 'A text message the moment an owner asks you for a quote.', live: false },
  { title: 'Saved replies', body: 'Reusable quote notes and message templates.', live: false },
];

export const ENTERPRISE_FEATURES: Feature[] = [
  { title: 'Every region, one account', body: 'All your offices, brands and regions under one login, with each quote request routed to the right regional team.', live: false },
  { title: 'Team roles', body: 'Unlimited team logins, with regional managers who see only their own areas.', live: false },
  { title: 'API and webhooks', body: 'Quote requests, messages and quote outcomes sent straight into your CRM or property management system, or through Zapier.', live: false },
  { title: 'Portfolio insights', body: 'Benchmarks and owner demand across every region side by side, with CSV exports.', live: false },
  { title: 'Suburb reports for every region', body: 'Market reports for all the areas you cover, refreshed quarterly.', live: false },
  { title: 'Regional quote templates', body: 'Different standard fees, inclusions and terms for each region, ready to send.', live: false },
  { title: 'Priority support', body: 'A named contact, help setting up every profile, and a quarterly review of your results.', live: false },
];

export const isPro = (m: { pro_until?: string | null }) => Boolean(m.pro_until && new Date(m.pro_until).getTime() > Date.now());

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
  const { data } = await adminClient().from('managers').select('pro_until').eq('id', managerId).maybeSingle();
  return data && isPro(data) ? PRO_PHOTOS : FREE_PHOTOS;
}
