import 'server-only';
import { createHmac } from 'crypto';
import { headers } from 'next/headers';
import { sendEmail } from '@/lib/email';
import { planOf, plansFor } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';

/*
 Account-sharing checks for manager logins. Each dashboard visit records the day, a hash of the IP, a hash of the
 browser, a rough device type and Vercel's approximate city. The daily job flags Free-plan logins that look shared
 (several devices across several cities, or two cities on the same day) and emails hello@. Nothing is blocked
 automatically: mobile networks and travel cause false alarms, so a person decides.
*/

function groupBy<T>(xs: T[], k: (x: T) => string) { const o: Record<string, T[]> = {}; for (const x of xs) (o[k(x)] ||= []).push(x); return o; }
const hash = (v: string) => createHmac('sha256', (process.env.ADMIN_TOKEN || 'x').trim()).update(v).digest('hex').slice(0, 16);

function deviceOf(ua: string) {
  const os = /iphone|ipad/i.test(ua) ? 'iOS' : /android/i.test(ua) ? 'Android' : /mac os/i.test(ua) ? 'Mac' : /windows/i.test(ua) ? 'Windows' : /linux/i.test(ua) ? 'Linux' : 'Other';
  const br = /edg\//i.test(ua) ? 'Edge' : /chrome|crios/i.test(ua) ? 'Chrome' : /firefox|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Browser';
  return `${br} on ${os}`;
}

/** Records a manager dashboard visit. Never throws. Needs SQL 015. */
export async function recordActivity(userId: string) {
  try {
    const h = await headers();
    const ua = h.get('user-agent') || '';
    if (!ua || /bot|crawl|headless|lighthouse/i.test(ua)) return;
    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const dec = (v: string | null) => { try { return v ? decodeURIComponent(v) : null; } catch { return v; } };
    const row = {
      user_id: userId, day: new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }), ip_hash: hash(ip), ua_hash: hash(ua), device: deviceOf(ua),
      city: dec(h.get('x-vercel-ip-city')), region: h.get('x-vercel-ip-country-region'), country: h.get('x-vercel-ip-country'), last_at: new Date().toISOString(),
    };
    const db = adminClient();
    const { data: ex } = await db.from('account_activity').select('hits').eq('user_id', userId).eq('day', row.day).eq('ip_hash', row.ip_hash).eq('ua_hash', row.ua_hash).maybeSingle();
    if (ex) await db.from('account_activity').update({ hits: ex.hits + 1, last_at: row.last_at }).eq('user_id', userId).eq('day', row.day).eq('ip_hash', row.ip_hash).eq('ua_hash', row.ua_hash);
    else await db.from('account_activity').insert(row);
  } catch { /* best-effort */ }
}

/** Daily: flags Free-plan manager logins that look shared, and emails hello@ once per login per 30 days. */
export async function checkSharing() {
  const db = adminClient();
  await db.from('account_activity').delete().lt('day', new Date(Date.now() - 365 * 86400e3).toISOString().slice(0, 10)); // privacy policy: kept 12 months
  const since = new Date(Date.now() - 14 * 86400e3).toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
  const { data: acts, error } = await db.from('account_activity').select('user_id, day, ua_hash, device, city, region').gte('day', since);
  if (error || !acts?.length) return [];
  const { data: mem } = await db.from('manager_members').select('user_id, manager_id').in('user_id', [...new Set(acts.map((a) => a.user_id))]);
  const plans = await plansFor([...new Set((mem || []).map((m) => m.manager_id))]);
  const lines: string[] = [];
  for (const [uid, rows] of Object.entries(groupBy(acts, (a) => a.user_id))) {
    const managers = (mem || []).filter((m) => m.user_id === uid).map((m) => m.manager_id);
    if (!managers.length || managers.some((id) => planOf(plans.get(id)) !== 'free')) continue; // paid plans have team logins
    const devices = new Set(rows!.map((r) => r.ua_hash)).size;
    const places = new Set(rows!.filter((r) => r.city).map((r) => `${r.city}, ${r.region}`));
    const sameDay = Object.values(groupBy(rows!.filter((r) => r.city), (r) => r.day)).some((d) => new Set(d!.map((r) => r.city)).size >= 2);
    const signals = [devices >= 4 && `${devices} different browsers or devices`, places.size >= 3 && `${places.size} different cities`, sameDay && 'two cities on the same day'].filter(Boolean) as string[];
    if (signals.length < 2) continue;
    const { data: recent } = await db.from('account_flags').select('id').eq('user_id', uid).gte('created_at', new Date(Date.now() - 30 * 86400e3).toISOString()).limit(1);
    if (recent?.length) continue;
    const email = (await db.auth.admin.getUserById(uid)).data.user?.email || uid;
    const { data: ms } = await db.from('managers').select('name').in('id', managers);
    const reason = `${signals.join(', ')} in 14 days. Places: ${[...places].slice(0, 6).join('; ') || 'unknown'}. Devices: ${[...new Set(rows!.map((r) => r.device))].join(', ')}.`;
    await db.from('account_flags').insert({ user_id: uid, manager_id: managers[0], reason });
    lines.push(`${email} (${(ms || []).map((m) => m.name).join(', ')}, Free plan): ${reason}`);
  }
  if (lines.length) {
    await sendEmail({
      to: 'hello@cohostcompare.com', subject: `Possible shared login${lines.length > 1 ? 's' : ''} on the Free plan`,
      text: `These Free-plan manager logins look like they're being shared:\n\n${lines.join('\n\n')}\n\nThis can be a false alarm (mobile networks and travel move people between cities). If it looks real, a friendly note that Pro includes 3 logins usually does it. Review and clear flags on the admin page.`,
      cta: { label: 'Open admin', url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com'}/admin` },
    });
  }
  return lines;
}
