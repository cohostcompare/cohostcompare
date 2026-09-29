import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { adminClient } from './supabase/server';

/** Signs an admin action (e.g. approving a claim) so the emailed link can't be forged. */
export function sign(value: string): string {
  const key = (process.env.ADMIN_TOKEN || '').replace(/[`'"\s]/g, '');
  if (!key) throw new Error('ADMIN_TOKEN is not set');
  return createHmac('sha256', key).update(value).digest('hex').slice(0, 32);
}

export function verify(value: string, sig: string): boolean {
  try {
    const a = Buffer.from(sign(value)), b = Buffer.from(String(sig || ''));
    return a.length === b.length && timingSafeEqual(a, b);
  } catch { return false; }
}

/** The bare domain of a website URL, e.g. https://www.foo.com.au/x -> foo.com.au */
export function siteDomain(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; }
}

/** True when the email's domain is the business's website domain (or a subdomain of it). */
export function emailMatchesSite(email: string, website: string | null): boolean {
  const d = siteDomain(website);
  const e = email.split('@')[1]?.toLowerCase();
  if (!d || !e) return false;
  return e === d || e.endsWith(`.${d}`);
}

/** Approves a claim: makes the user an owner of the manager profile. Server only. */
export async function approveClaim(claimId: string) {
  const db = adminClient();
  const { data: c } = await db.from('manager_claims').select('id, manager_id, user_id, status').eq('id', claimId).single();
  if (!c) throw new Error('Claim not found');
  await db.from('manager_claims').update({ status: 'approved', decided_at: new Date().toISOString() }).eq('id', c.id);
  await db.from('manager_members').upsert({ manager_id: c.manager_id, user_id: c.user_id, role: 'owner' });
  await db.from('managers').update({ claimed: true, updated_at: new Date().toISOString() }).eq('id', c.manager_id);
}

