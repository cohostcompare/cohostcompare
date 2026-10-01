import 'server-only';
import { TEST_SLUG } from '@/lib/data';
import { PRO_CENTS } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';

/*
 Numbers for the admin dashboard: this week vs last week, and 12 weekly buckets for the charts.
 Weeks are rolling 7-day periods ending now. Requests that only went to the internal test profile are left out.
*/

const DAY = 86400e3;
export const WEEKS = 12;
export type Series = { label: string; values: number[] };

const bucket = (iso: string, now: number) => {
  const age = now - new Date(iso).getTime();
  const i = WEEKS - 1 - Math.floor(age / (7 * DAY));
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

  const labels = Array.from({ length: WEEKS }, (_, i) => new Date(now - (WEEKS - i) * 7 * DAY + DAY).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' }));
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
    overdueManagers: (late.data || []).length, overdueRequests: new Set((late.data || []).map((x) => x.request_id)).size,
  };
}
