'use server';

import { redirect } from 'next/navigation';
import { myManagers, requireManager, requireThread } from '@/lib/managers';
import { planOf, plansFor } from '@/lib/pro';
import { otherAcceptedFor } from '@/lib/todo';
import { billingPortal, proCheckout, stripeOn, unlockCheckout } from '@/lib/stripe';
import { adminClient, currentUser } from '@/lib/supabase/server';

async function billingRow(id: string) {
  const { data } = await adminClient().from('managers').select('stripe_customer_id, stripe_subscription_id, pro_until, pro_note').eq('id', id).maybeSingle();
  return data;
}

/** Start a Pro subscription in Stripe Checkout. */
export async function startPro(form: FormData) {
  const slug = String(form.get('slug') || '');
  const { user, manager: m } = await requireManager(slug, '/dashboard');
  if (!stripeOn()) redirect('/dashboard?billing=soon');
  const b = await billingRow(m.id);
  if (b?.stripe_subscription_id) redirect('/dashboard');
  const s = await proCheckout({ managerId: m.id, slug, customerId: b?.stripe_customer_id, email: user.email!, trialEnd: b?.pro_note === 'founding' ? b.pro_until : null });
  redirect(s.url);
}

/** Card, invoices and cancelling, in Stripe's billing portal. */
export async function manageBilling(form: FormData) {
  const slug = String(form.get('slug') || '');
  const { manager: m } = await requireManager(slug, '/dashboard');
  const b = await billingRow(m.id);
  if (!b?.stripe_customer_id) redirect('/dashboard');
  redirect((await billingPortal(b.stripe_customer_id)).url);
}

/** Pay to unlock an owner who accepted (Free plan). */
export async function unlockClient(form: FormData) {
  const { user, thread, req } = await requireThread(String(form.get('thread') || ''));
  const db = adminClient();
  const mine = (await myManagers(user.id)).find((x) => x.slug === thread.manager_slug)!;
  if (planOf((await plansFor([mine.id])).get(mine.id)) !== 'free') redirect(`/dashboard/requests/${thread.id}`);
  const { data: fee } = await db.from('success_fees').select('id, status').eq('thread_id', thread.id).maybeSingle();
  if (!fee || !['awaiting_unlock', 'expired'].includes(fee.status)) redirect(`/dashboard/requests/${thread.id}`);
  // Nothing to unlock if the owner has since chosen another manager, or the request (and owner) no longer exists.
  if (!req || await otherAcceptedFor(thread.request_id, thread.manager_slug)) redirect(`/dashboard/requests/${thread.id}`);
  if (!stripeOn()) redirect(`/dashboard/requests/${thread.id}?billing=soon`);
  const b = await billingRow(mine.id);
  const u = await currentUser();
  const s = await unlockCheckout({ feeId: fee.id, threadId: thread.id, managerId: mine.id, customerId: b?.stripe_customer_id, email: u!.email!, where: `${req.suburb || ''} ${req.state || ''} ${req.postcode}`.trim() });
  await db.from('success_fees').update({ stripe_session_id: s.id }).eq('id', fee.id);
  redirect(s.url);
}
