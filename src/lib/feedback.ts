import 'server-only';
import { isAdminEmail } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';

/*
 Feedback from the people we're building for (SQL 018). Anyone can use /feedback any time. The pop-up only
 asks people who've genuinely used the site:
 - owners: sent a quote request at least 2 days ago, and have received a quote or sent a message
 - managers: used their dashboard on at least 3 different days, and joined at least 7 days ago
 It shows at most 3 times, never within 7 days of the last time, and never again after feedback or "no thanks".
 Thank-you rewards (one per person, for a genuine answer, never for positive feedback):
 - managers: 1 month of Pro free, added on top of any free Pro they already have (paying subscribers get a
   month's credit, applied by hand)
 - owners: an A$25 digital gift card for the first OWNER_REWARD_LIMIT owners, sent by hand from /admin/feedback
*/

export const OWNER_REWARD_LIMIT = 30;
export const OWNER_REWARD = 'an A$25 digital gift card';
export const MANAGER_REWARD = '1 month of Pro free';
export const MIN_GENUINE = 40; // characters in "what should we improve" to qualify for the reward

export type Role = 'owner' | 'manager';
export type FeedbackCtx = { role: Role; managerId: string | null; managerName: string | null; eligible: boolean; reward: string | null; given: boolean };

const DAY = 86400e3;

/** Who this user is to us, whether they've done enough to be asked, and what we'd thank them with. */
export async function feedbackContext(user: { id: string; email?: string | null }): Promise<FeedbackCtx | null> {
  const db = adminClient();
  const { data: prior, error } = await db.from('feedback').select('id, reward_status').eq('user_id', user.id).limit(5);
  if (error) return null; // 018 not run yet
  const rewarded = (prior || []).some((f) => f.reward_status !== 'none');
  const { data: mem } = await db.from('manager_members').select('manager_id, created_at, managers(name)').eq('user_id', user.id).order('created_at').limit(1);
  if (mem?.length) {
    const m = mem[0];
    const { count: days } = await db.from('account_activity').select('day', { count: 'exact', head: true }).eq('user_id', user.id).gte('day', new Date(Date.now() - 90 * DAY).toISOString().slice(0, 10));
    // account_activity has one row per day per device, so this slightly overcounts people on two devices. Fine for a prompt.
    const eligible = (days ?? 0) >= 3 && Date.now() - new Date(m.created_at).getTime() >= 7 * DAY;
    return { role: 'manager', managerId: m.manager_id, managerName: (m.managers as unknown as { name: string } | null)?.name ?? null, eligible, reward: rewarded ? null : MANAGER_REWARD, given: Boolean(prior?.length) };
  }
  const { data: reqs } = await db.from('quote_requests').select('id, created_at, quote_request_managers(id, status)').eq('owner_id', user.id).limit(20);
  const old = (reqs || []).filter((r) => Date.now() - new Date(r.created_at).getTime() >= 2 * DAY);
  let engaged = old.some((r) => (r.quote_request_managers as { status: string }[] || []).some((t) => ['quoted', 'accepted', 'declined'].includes(t.status)));
  if (!engaged && old.length) {
    const ids = old.flatMap((r) => (r.quote_request_managers as { id: string }[] || []).map((t) => t.id));
    const { count } = await db.from('messages').select('id', { count: 'exact', head: true }).in('thread_id', ids.slice(0, 100)).eq('sender', 'owner');
    engaged = (count ?? 0) > 0;
  }
  let reward: string | null = null;
  if (!rewarded) {
    const { count: given } = await db.from('feedback').select('id', { count: 'exact', head: true }).eq('role', 'owner').in('reward_status', ['to_send', 'sent']);
    reward = (given ?? 0) < OWNER_REWARD_LIMIT ? OWNER_REWARD : null;
  }
  return { role: 'owner', managerId: null, managerName: null, eligible: Boolean(reqs?.length) && engaged, reward, given: Boolean(prior?.length) };
}

/** Whether to show the pop-up to this user now. Never throws. */
export async function shouldPrompt(user: { id: string; email?: string | null }): Promise<FeedbackCtx | null> {
  try {
    if (isAdminEmail(user.email)) return null;
    const { data: p, error } = await adminClient().from('feedback_prompts').select('shown_count, last_shown_at, snoozed_until, dismissed_at').eq('user_id', user.id).maybeSingle();
    if (error) return null;
    if (p?.dismissed_at || (p?.shown_count ?? 0) >= 3) return null;
    if (p?.snoozed_until && new Date(p.snoozed_until).getTime() > Date.now()) return null;
    if (p?.last_shown_at && Date.now() - new Date(p.last_shown_at).getTime() < 7 * DAY) return null;
    const ctx = await feedbackContext(user);
    return ctx && ctx.eligible && !ctx.given ? ctx : null;
  } catch { return null; }
}

/** Thank-you reward after genuine feedback. Returns the status to store. */
export async function grantReward(ctx: FeedbackCtx): Promise<'none' | 'granted' | 'to_send' | 'manual'> {
  if (!ctx.reward) return 'none';
  if (ctx.role === 'owner') return 'to_send';
  const db = adminClient();
  const { data: m } = await db.from('managers').select('id, plan, pro_until, pro_note, stripe_subscription_id').eq('id', ctx.managerId!).maybeSingle();
  if (!m) return 'none';
  // Already on Pro or Enterprise with no end date (paying monthly, or set by admin): credit a month by hand.
  if ((m.plan === 'pro' || m.plan === 'enterprise') && !m.pro_until) return 'manual';
  if (m.plan === 'enterprise') return 'manual';
  const base = m.pro_until && new Date(m.pro_until).getTime() > Date.now() ? new Date(m.pro_until) : new Date();
  base.setMonth(base.getMonth() + 1);
  const { error } = await db.from('managers').update({ pro_until: base.toISOString(), pro_note: m.pro_note || 'feedback' }).eq('id', m.id);
  return error ? 'manual' : 'granted';
}
