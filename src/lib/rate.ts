import 'server-only';
import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { adminClient } from '@/lib/supabase/server';

/*
 Shared rate limiting on `rate_events` (SQL 019, purged after 7 days), so it works across serverless instances.
 `who` is a scrambled network address or a user id: we never store raw IPs.
*/

export function ipKey(ip: string) {
  return `ip:${createHash('sha256').update(`${ip}|${process.env.ADMIN_TOKEN || ''}`).digest('hex').slice(0, 24)}`;
}

/** The caller's scrambled network key, from the request headers (server actions and route handlers). */
export async function callerKey(h?: Headers) {
  const hh = h || (await headers());
  const ip = (hh.get('x-forwarded-for') || '').split(',')[0].trim() || hh.get('x-real-ip') || 'unknown';
  return ipKey(ip);
}

/**
 * True when `who` may do `kind` again (fewer than `max` in the last `windowMs`), and records this attempt.
 * On a database error it allows the request: a limiter must never take the site down.
 */
export async function allow(kind: string, who: string, max: number, windowMs: number, item?: string) {
  const db = adminClient();
  const { count, error } = await db.from('rate_events').select('id', { count: 'exact', head: true }).eq('kind', kind).eq('who', who).gte('created_at', new Date(Date.now() - windowMs).toISOString());
  if (!error && (count ?? 0) >= max) return false;
  await db.from('rate_events').insert({ kind, who, item: item ?? null }).then(() => {}, () => {});
  return true;
}

/** A global daily cap on `kind` across everyone (e.g. paid API calls). Counts only, so pair it with `allow` to record. */
export async function underDailyTotal(kind: string, max: number) {
  const { count, error } = await adminClient().from('rate_events').select('id', { count: 'exact', head: true }).eq('kind', kind).gte('created_at', new Date(Date.now() - 86400e3).toISOString());
  return error || (count ?? 0) < max;
}
