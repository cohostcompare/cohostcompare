import 'server-only';
import { sign, verify } from '@/lib/claims';
import { adminClient } from '@/lib/supabase/server';

/*
 Partner offers for owners (SQL 017). Businesses apply at /partners (not linked anywhere until offers go live),
 Ben approves them at /admin/partners, and each partner manages its offer through a private signed link.
 Owners only see offers on /setup, and only when the admin switch "offers_live" is on AND the partner is approved
 AND has accepted the partner agreement (flow: apply -> Ben approves -> partner accepts the agreement in their portal -> live). Offers are always labelled, and say when we earn a referral fee. They never touch managers,
 rankings, ratings or the quote comparison. Clicks go through /go/[id] so partners can see what they get.
*/

export const CATEGORIES = ['Insurance', 'Cleaning and linen', 'Photography', 'Furnishing and styling', 'Smart locks and access', 'Maintenance and handyman', 'Accounting and tax', 'Other'] as const;

export type Partner = {
  id: string; created_at: string; name: string; contact_name: string | null; email: string; phone: string | null; website: string | null;
  category: string; areas: string | null; offer_title: string | null; offer_body: string | null; offer_url: string | null; promo_code: string | null;
  logo_url: string | null; referral_fee: boolean; admin_note: string | null; status: 'pending' | 'approved' | 'hidden' | 'rejected'; sort: number;
  fee_terms?: string | null; agreed_at?: string | null; agreed_version?: string | null; agreed_name?: string | null;
};

/** Bump when the partner agreement (/partners/agreement) changes; partners on an older version are asked to accept again. */
export const PARTNER_TERMS_VERSION = '2026-10-02';
export const agreedCurrent = (p: Pick<Partner, 'agreed_at' | 'agreed_version'>) => Boolean(p.agreed_at && p.agreed_version === PARTNER_TERMS_VERSION);

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
export const manageUrl = (id: string) => `${SITE}/partners/manage/${id}?s=${sign(`partner:${id}`)}`;
export const manageOk = (id: string, s: string) => verify(`partner:${id}`, s);

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await adminClient().from('site_settings').select('value').eq('key', key).maybeSingle();
  return error || !data ? fallback : (data.value as T);
}
export async function setSetting(key: string, value: unknown) {
  return adminClient().from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() });
}

export async function approvedPartners(): Promise<Partner[]> {
  const { data, error } = await adminClient().from('partners').select('*').eq('status', 'approved').order('sort').order('created_at');
  return error ? [] : (data as Partner[]);
}

/** Offers for owners: empty unless switched on in admin and at least one partner is approved. */
export async function liveOffers(): Promise<Partner[]> {
  try {
    if (!(await getSetting<boolean>('offers_live', false))) return [];
    // Only partners who've accepted the current partner agreement (SQL 020) show to owners.
    return (await approvedPartners()).filter((p) => p.offer_title && (p.offer_url || p.website) && p.agreed_at);
  } catch { return []; }
}

export const cleanUrl = (raw: unknown) => {
  const s = String(raw || '').trim();
  if (!s) return null;
  try { const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString().slice(0, 500) : null; } catch { return null; }
};

/** On the 1st of each month (daily cron): emails each approved partner last month's clicks, once offers are live. */
export async function monthlyPartnerReports() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  if (now.getDate() !== 1) return 0;
  if (!(await getSetting<boolean>('offers_live', false).catch(() => false))) return 0;
  const db = adminClient();
  const { data } = await db.from('partners').select('id, name, email, contact_name').eq('status', 'approved').not('agreed_at', 'is', null);
  const end = new Date(Date.now() - 2 * 3600e3); // just before midnight Sydney
  const start = new Date(end.getTime() - 31 * 86400e3);
  const month = start.toLocaleDateString('en-AU', { month: 'long', timeZone: 'Australia/Sydney' });
  const { sendEmail } = await import('@/lib/email');
  let n = 0;
  for (const p of data || []) {
    const { count } = await db.from('partner_clicks').select('id', { count: 'exact', head: true }).eq('partner_id', p.id).gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
    await sendEmail({ to: p.email, subject: `${p.name} on CoHostCompare: ${count ?? 0} owner click${count === 1 ? '' : 's'} in ${month}`, text: `Hi ${p.contact_name?.split(' ')[0] || 'there'},\n\nIn ${month}, ${count ?? 0} owner${count === 1 ? '' : 's'} clicked through to ${p.name}'s offer from our setup guide.\n\nA fresh offer or promo code can lift clicks. Update it any time from your partner page:\n${manageUrl(p.id)}\n\nThe CoHostCompare team` });
    n++;
  }
  return n;
}
