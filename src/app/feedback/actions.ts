'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sendEmail } from '@/lib/email';
import { feedbackContext, grantReward, MIN_GENUINE, shouldPrompt } from '@/lib/feedback';
import { adminClient, currentUser } from '@/lib/supabase/server';

type State = { error?: string };
const t = (f: FormData, k: string, n: number) => String(f.get(k) || '').trim().slice(0, n) || null;
const num = (f: FormData, k: string, lo: number, hi: number) => { const v = f.get(k); if (v === null || v === '') return null; const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };

export async function sendFeedback(_: State, form: FormData): Promise<State> {
  if (form.get('website_url')) redirect('/feedback?thanks=1'); // honeypot
  const user = await currentUser();
  const ctx = user ? await feedbackContext(user) : null;
  const improve = t(form, 'improve', 3000);
  if (!improve || improve.length < 10) return { error: 'Tell us at least one thing we could do better.' };
  const email = user?.email || t(form, 'email', 200);
  const row = {
    user_id: user?.id ?? null, email, role: ctx?.role ?? 'visitor', manager_id: ctx?.managerId ?? null,
    ease: num(form, 'ease', 1, 5), nps: num(form, 'nps', 0, 10), improve, confusing: t(form, 'confusing', 3000), wish: t(form, 'wish', 3000),
    heard_from: t(form, 'heard_from', 80), contact_ok: form.get('contact_ok') === 'on', page: t(form, 'page', 200),
  };
  const db = adminClient();
  const { data, error } = await db.from('feedback').insert(row).select('id').single();
  if (error || !data) { console.error('feedback', error); return { error: 'We couldn’t save that just now. Please try again in a minute, or email hello@cohostcompare.com.' }; }
  // The reward is for a genuine, specific answer, never for saying nice things.
  const genuine = improve.length >= MIN_GENUINE;
  let status: Awaited<ReturnType<typeof grantReward>> = 'none';
  if (ctx?.reward && genuine) {
    status = await grantReward(ctx);
    await db.from('feedback').update({ reward: ctx.reward, reward_status: status }).eq('id', data.id);
  }
  if (user) await db.from('feedback_prompts').upsert({ user_id: user.id, dismissed_at: new Date().toISOString() }).then(() => {}, () => {});
  (await cookies()).set('cc_fb', 'done', { maxAge: 365 * 86400, path: '/', sameSite: 'lax', secure: true, httpOnly: true });
  const who = ctx?.role === 'manager' ? `Manager (${ctx.managerName})` : ctx?.role === 'owner' ? 'Owner' : 'Visitor';
  await sendEmail({
    to: 'hello@cohostcompare.com', subject: `Feedback from ${who}${row.nps != null ? `: ${row.nps}/10` : ''}`,
    text: `${who}${email ? ` <${email}>` : ''}${row.contact_ok ? ' (happy to be contacted)' : ''}\nEase: ${row.ease ?? '-'}/5 · Recommend: ${row.nps ?? '-'}/10${row.heard_from ? ` · Heard from: ${row.heard_from}` : ''}\n\nImprove:\n${improve}${row.confusing ? `\n\nConfusing or nearly stopped them:\n${row.confusing}` : ''}${row.wish ? `\n\n${ctx?.role === 'manager' ? 'Would make Pro worth paying for' : 'Wish we had'}:\n${row.wish}` : ''}\n\nReward: ${status === 'none' ? 'none' : `${ctx?.reward} (${status})`}${status === 'to_send' ? ' — send the gift card from /admin/feedback' : status === 'manual' ? ' — they already pay or have open-ended Pro: credit a month by hand' : ''}`,
    replyTo: email || undefined,
    cta: { label: 'Open feedback', url: 'https://www.cohostcompare.com/admin/feedback' },
  });
  if (email && status !== 'none') {
    const what = status === 'granted' ? `We've added ${ctx!.reward} to ${ctx!.managerName || 'your account'}. You'll see it on your dashboard straight away.`
      : status === 'to_send' ? `As a thank you, we'll email you ${ctx!.reward} within a few business days.`
      : `As a thank you, we'll credit a month of Pro to your account. We'll confirm by email once it's done.`;
    await sendEmail({ to: email, subject: 'Thanks for your feedback', text: `Hi,\n\nThank you for taking the time to tell us what you think. CoHostCompare is new, and feedback like yours decides what we build next.\n\n${what}\n\nIf anything else comes to mind, just reply to this email.\n\nBen Deeley\nFounder, CoHostCompare`, from: 'Ben from CoHostCompare <hello@cohostcompare.com>' });
  }
  redirect(`/feedback?thanks=1${status !== 'none' ? `&r=${status}` : ''}`);
}

/** The pop-up's "Later" and "No thanks" buttons, and recording that it was shown. */
export async function promptAction(kind: 'shown' | 'later' | 'never') {
  const user = await currentUser();
  if (!user) return;
  const db = adminClient();
  const { data: p } = await db.from('feedback_prompts').select('shown_count').eq('user_id', user.id).maybeSingle();
  const now = new Date();
  const row: Record<string, unknown> = { user_id: user.id };
  if (kind === 'shown') { row.shown_count = (p?.shown_count ?? 0) + 1; row.last_shown_at = now.toISOString(); }
  if (kind === 'later') row.snoozed_until = new Date(now.getTime() + 7 * 86400e3).toISOString();
  if (kind === 'never') row.dismissed_at = now.toISOString();
  await db.from('feedback_prompts').upsert(row).then(() => {}, () => {});
  if (kind !== 'shown') (await cookies()).set('cc_fb', kind === 'never' ? 'done' : 'later', { maxAge: kind === 'never' ? 365 * 86400 : 7 * 86400, path: '/', sameSite: 'lax', secure: true, httpOnly: true });
}

/** Called once per browser session by the pop-up: should we ask this person now? */
export async function checkPrompt(): Promise<{ role: 'owner' | 'manager'; reward: string | null } | null> {
  const user = await currentUser();
  if (!user) return null;
  const ctx = await shouldPrompt(user);
  return ctx ? { role: ctx.role, reward: ctx.reward } : null;
}
