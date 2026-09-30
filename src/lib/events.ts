import 'server-only';
import { headers } from 'next/headers';
import { adminClient } from '@/lib/supabase/server';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora|pinterest|vercel-screenshot|headless|lighthouse/i;

/** Counts profile views or search appearances for managers (skips bots). Never throws. Needs SQL 011. */
export async function bump(ids: string[], kind: 'view' | 'search') {
  try {
    if (!ids.length) return;
    const ua = (await headers()).get('user-agent') || '';
    if (!ua || BOT.test(ua)) return;
    await adminClient().rpc('bump_manager_events', { p_ids: ids.slice(0, 50), p_kind: kind });
  } catch { /* stats are best-effort */ }
}

/** Last 30 days of views and search appearances per manager id. */
export async function eventTotals(ids: string[]) {
  const out = new Map<string, { view: number; search: number }>();
  if (!ids.length) return out;
  const since = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  const { data, error } = await adminClient().from('manager_events').select('manager_id, kind, count').in('manager_id', ids).gte('day', since);
  if (error) return out;
  for (const r of data || []) {
    const t = out.get(r.manager_id) || { view: 0, search: 0 };
    t[r.kind as 'view' | 'search'] += r.count;
    out.set(r.manager_id, t);
  }
  return out;
}
