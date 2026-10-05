import 'server-only';
import { TEST_SLUG } from '@/lib/data';
import { PRO_CENTS } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';

/*
 Numbers for the admin dashboard: this week vs last week, and 12 weekly buckets for the charts.
 Weeks are calendar weeks, Monday to Sunday, Sydney time (Ben, Oct 2026). The last bucket is the current week so far.
 Requests that only went to the internal test profile are left out.
*/

const DAY = 86400e3;
export const WEEKS = 12;
export type Series = { label: string; values: number[] };

/** Midnight at the start of the current Monday in Sydney, as a UTC timestamp. */
export function weekStart(now: number) {
  const fmt = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(now)).map((x) => [x.type, x.value]));
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday);
  // Sydney wall-clock → UTC: local midnight of the Monday is (local now − time of day − days since Monday); work it out via the offset.
  const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute));
  const offset = localAsUtc - Math.floor(now / 60000) * 60000; // Sydney minus UTC, in ms
  const mondayLocalAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) - Math.max(0, dow));
  let t = mondayLocalAsUtc - offset;
  // Daylight saving may have changed between Monday and now: re-check the offset at the Monday itself.
  const p2 = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  const drift = (Number(p2.hour) % 24) * 3600e3 + Number(p2.minute) * 60000;
  if (drift) t -= drift > 12 * 3600e3 ? drift - 24 * 3600e3 : drift;
  return t;
}

const bucket = (iso: string, now: number) => {
  const start0 = weekStart(now) - (WEEKS - 1) * 7 * DAY;
  const i = Math.floor((new Date(iso).getTime() - start0) / (7 * DAY));
  return i >= 0 && i < WEEKS ? i : -1;
};
const zero = () => Array.from({ length: WEEKS }, () => 0);

export async function adminStats() {
  const db = adminClient();
  const now = Date.now();
  const since = new Date(now - WEEKS * 7 * DAY).toISOString();
  const [visits, reqs, threads, claims, pending, published, claimed, plans, fees, feedback, late] = await Promise.all([
    db.from('funnel_events').select('created_at, source').eq('kind', 'visit').gte('created_at', since).limit(100000),
    db.from('quote_requests').select('id, created_at, quote_request_managers(manager_slug)').gte('created_at', since).limit(10000),
    db.from('quote_request_managers').select('created_at, accepted_at, status, manager_slug').gte('created_at', since).neq('manager_slug', TEST_SLUG).limit(20000),
    db.from('manager_claims').select('created_at, status').gte('created_at', since).limit(5000),
    db.from('manager_claims').select('id', { count: 'exact', head: true }).in('status', ['pending', 'info_requested', 'info_received']),
    db.from('managers').select('id', { count: 'exact', head: true }).eq('published', true),
    db.from('managers').select('id', { count: 'exact', head: true }).eq('claimed', true),
    db.from('managers').select('plan, pro_until, pro_note, stripe_subscription_id').eq('claimed', true).neq('slug', TEST_SLUG).limit(5000),
    db.from('success_fees').select('amount, status, updated_at').eq('status', 'paid').gte('updated_at', new Date(now - 31 * DAY).toISOString()).limit(5000),
    db.from('feedback').select('nps').not('nps', 'is', null).limit(5000),
    // Overdue: a manager hasn't quoted, declined or replied 48h after a request (last 90 days).
    db.from('quote_request_managers').select('request_id').in('status', ['sent', 'viewed']).neq('manager_slug', TEST_SLUG).lt('created_at', new Date(now - 48 * 3600e3).toISOString()).gte('created_at', new Date(now - 90 * DAY).toISOString()).limit(5000),
  ]);

  const ads = zero(), google = zero(), other = zero();
  for (const v of visits.data || []) {
    const i = bucket(v.created_at, now); if (i < 0) continue;
    if (v.source === 'ads') ads[i]++; else if (v.source === 'google') google[i]++; else other[i]++;
  }
  const requests = zero();
  for (const r of reqs.data || []) {
    const ms = (r.quote_request_managers as { manager_slug: string }[] | null) || [];
    if (ms.length && ms.every((m) => m.manager_slug === TEST_SLUG)) continue;
    const i = bucket(r.created_at, now); if (i >= 0) requests[i]++;
  }
  const contacted = zero(), accepted = zero();
  for (const t of threads.data || []) {
    const i = bucket(t.created_at, now); if (i >= 0) contacted[i]++;
    if (t.accepted_at) { const j = bucket(t.accepted_at, now); if (j >= 0) accepted[j]++; }
  }
  const claimSeries = zero();
  for (const c of claims.data || []) { const i = bucket(c.created_at, now); if (i >= 0) claimSeries[i]++; }

  const live = (d?: string | null) => Boolean(d && new Date(d).getTime() > now);
  const payingPro = (plans.data || []).filter((m) => m.stripe_subscription_id).length;
  const freePro = (plans.data || []).filter((m) => !m.stripe_subscription_id && (live(m.pro_until) || ((m.plan === 'pro' || m.plan === 'enterprise') && !m.pro_until))).length;
  const unlocks30 = (fees.data || []).reduce((s, f) => s + Number(f.amount || 0), 0);
  const scored = (feedback.data || []).map((f) => f.nps as number);
  const nps = scored.length ? Math.round(((scored.filter((n) => n >= 9).length - scored.filter((n) => n <= 6).length) / scored.length) * 100) : null;

  const start0 = weekStart(now) - (WEEKS - 1) * 7 * DAY;
  const labels = Array.from({ length: WEEKS }, (_, i) => new Date(start0 + i * 7 * DAY + 12 * 3600e3).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' }));
  const weekDay = Math.min(7, Math.floor((now - weekStart(now)) / DAY) + 1); // 1 = Monday
  const last = (xs: number[]) => xs[WEEKS - 1], prev = (xs: number[]) => xs[WEEKS - 2];
  const visitors = ads.map((a, i) => a + google[i] + other[i]);
  return {
    labels,
    series: { ads, google, other, visitors, requests, contacted, accepted, claims: claimSeries },
    week: {
      visitors: [last(visitors), prev(visitors)], ads: [last(ads), prev(ads)], google: [last(google), prev(google)],
      requests: [last(requests), prev(requests)], contacted: [last(contacted), prev(contacted)], accepted: [last(accepted), prev(accepted)], claims: [last(claimSeries), prev(claimSeries)],
    } as Record<string, [number, number]>,
    claimsToReview: pending.count ?? 0, published: published.count ?? 0, claimed: claimed.count ?? 0,
    payingPro, freePro, mrr: payingPro * (PRO_CENTS / 100), unlocks30, nps, npsCount: scored.length,
    trackingReady: !visits.error,
    weekDay, weekFrom: new Date(weekStart(now) + 12 * 3600e3).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' }),
    overdueManagers: (late.data || []).length, overdueRequests: new Set((late.data || []).map((x) => x.request_id)).size,
  };
}
