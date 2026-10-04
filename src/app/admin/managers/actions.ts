'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';

/** Hide a manager from search, profiles and quote requests (e.g. they asked to be removed), or show them again. */
export async function setVisibility(form: FormData) {
  const admin = await requireAdmin('/admin/managers');
  const id = String(form.get('id') || '');
  const show = form.get('show') === '1';
  const reason = String(form.get('reason') || '').trim().slice(0, 500);
  const q = String(form.get('q') || '');
  if (!show && !reason) redirect(`/admin/managers?q=${encodeURIComponent(q)}&error=${encodeURIComponent('Add a short reason before hiding a manager.')}`);
  const db = adminClient();
  const { error } = await db.from('managers').update({ published: show }).eq('id', id);
  if (error) redirect(`/admin/managers?q=${encodeURIComponent(q)}&error=${encodeURIComponent(error.message)}`);
  await db.from('manager_edits').insert({ manager_id: id, user_id: admin.id, changes: { published: show, reason: reason || null, by: 'admin' } });
  revalidatePath('/admin/managers');
  const back = String(form.get('back') || '');
  if (back.startsWith('/admin/')) redirect(back);
  redirect(`/admin/managers?q=${encodeURIComponent(q)}&done=${show ? 'shown' : 'hidden'}`);
}

/** Admin confirms (or removes) a manager's verified-business badge after checking the ABN by hand. */
export async function setVerified(form: FormData) {
  const admin = await requireAdmin('/admin/managers');
  const id = String(form.get('id') || '');
  const on = form.get('on') === '1';
  const q = String(form.get('q') || '');
  const { error } = await adminClient().from('managers').update({ abn_verified_at: on ? new Date().toISOString() : null }).eq('id', id);
  if (error) redirect(`/admin/managers?q=${encodeURIComponent(q)}&error=${encodeURIComponent(error.message)}`);
  await adminClient().from('manager_edits').insert({ manager_id: id, user_id: admin.id, changes: { abn_verified: on, by: 'admin' } });
  revalidatePath('/admin/managers');
  redirect(`/admin/managers?q=${encodeURIComponent(q)}&done=${on ? 'verified' : 'unverified'}`);
}

/** Sets a claimed manager's plan by hand until billing exists (e.g. an Enterprise deal, or extending a trial). */
export async function setPlan(form: FormData) {
  const admin = await requireAdmin('/admin/managers');
  const id = String(form.get('id') || '');
  const q = String(form.get('q') || '');
  const plan = String(form.get('plan') || 'free');
  const months = Number(form.get('months') || 0);
  if (!['free', 'pro', 'enterprise'].includes(plan)) redirect('/admin/managers');
  // A manager paying through Stripe keeps Pro while the subscription is live; cancel it in Stripe (or they do, from Billing) rather than setting Free here.
  const { data: cur } = await adminClient().from('managers').select('stripe_subscription_id, name').eq('id', id).maybeSingle();
  if (plan === 'free' && cur?.stripe_subscription_id) redirect(`/admin/managers?q=${encodeURIComponent(q)}&error=${encodeURIComponent(`${cur.name} pays for Pro through Stripe. Cancel the subscription in Stripe first (the webhook then sets them to Free), or ask them to cancel from Billing in their dashboard.`)}`);
  const until = months > 0 ? new Date(Date.now() + months * 30.44 * 86400e3).toISOString() : null;
  const { error } = await adminClient().from('managers').update({ plan, pro_until: plan === 'free' ? null : until, pro_note: plan === 'free' ? null : 'admin' }).eq('id', id);
  if (error) redirect(`/admin/managers?q=${encodeURIComponent(q)}&error=${encodeURIComponent(error.message)}`);
  await adminClient().from('manager_edits').insert({ manager_id: id, user_id: admin.id, changes: { plan, months, by: 'admin' } });
  revalidatePath('/admin/managers');
  redirect(`/admin/managers?q=${encodeURIComponent(q)}&done=${encodeURIComponent(`set to ${plan}`)}`);
}
