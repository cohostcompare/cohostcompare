import { NextResponse, type NextRequest } from 'next/server';
import { sendEmail } from '@/lib/email';
import { completeUnlock } from '@/lib/intro';
import { PRICE_LOCK_MONTHS } from '@/lib/pro';
import { verifyStripe } from '@/lib/stripe';
import { adminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// Stripe webhook: checkout.session.completed, customer.subscription.updated/deleted, invoice.payment_failed.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyStripe(raw, req.headers.get('stripe-signature'))) return new NextResponse('Bad signature', { status: 400 });
  const evt = JSON.parse(raw) as { type: string; data: { object: Obj } };
  const o = evt.data.object;
  const db = adminClient();

  if (evt.type === 'checkout.session.completed') {
    const kind = o.metadata?.kind;
    if (kind === 'unlock' && o.payment_status === 'paid') {
      if (o.customer && o.metadata?.manager_id) await db.from('managers').update({ stripe_customer_id: o.customer }).eq('id', o.metadata.manager_id).is('stripe_customer_id', null);
      await completeUnlock(o.metadata.thread_id, 'paid', o.id);
    }
    if (kind === 'pro' && o.metadata?.manager_id) {
      const id = o.metadata.manager_id;
      await db.from('managers').update({ plan: 'pro', pro_until: null, pro_note: 'stripe', stripe_customer_id: o.customer, stripe_subscription_id: o.subscription, price_locked_until: new Date(Date.now() + PRICE_LOCK_MONTHS * 30.44 * 86400e3).toISOString() }).eq('id', id);
      // Anything waiting to be unlocked is covered by Pro.
      const { data: waiting } = await db.from('success_fees').select('thread_id').eq('manager_id', id).in('status', ['awaiting_unlock', 'expired']);
      for (const w of waiting || []) await completeUnlock(w.thread_id, 'waived');
      const { data: m } = await db.from('managers').select('name').eq('id', id).maybeSingle();
      await sendEmail({ to: 'hello@cohostcompare.com', subject: `New Pro subscriber: ${m?.name || id}`, text: `${m?.name} started Pro through Stripe.` });
    }
  }

  if (evt.type === 'customer.subscription.updated' || evt.type === 'customer.subscription.deleted') {
    const id = o.metadata?.manager_id;
    const target = id ? { col: 'id', val: id } : { col: 'stripe_subscription_id', val: o.id };
    const ended = evt.type === 'customer.subscription.deleted' || ['canceled', 'unpaid', 'incomplete_expired'].includes(o.status);
    if (ended) await db.from('managers').update({ plan: 'free', pro_until: null, pro_note: null, stripe_subscription_id: null }).eq(target.col, target.val);
    else if (o.cancel_at_period_end) await db.from('managers').update({ plan: 'pro', pro_until: new Date(o.current_period_end * 1000).toISOString() }).eq(target.col, target.val);
    else if (['active', 'trialing', 'past_due'].includes(o.status)) await db.from('managers').update({ plan: 'pro', pro_until: null, stripe_subscription_id: o.id }).eq(target.col, target.val);
  }

  if (evt.type === 'invoice.payment_failed') {
    const { data: m } = await db.from('managers').select('name').eq('stripe_customer_id', o.customer).maybeSingle();
    await sendEmail({ to: 'hello@cohostcompare.com', subject: `Payment failed: ${m?.name || o.customer}`, text: `A Pro payment failed for ${m?.name || o.customer}. Stripe will retry and email them. Invoice: ${o.hosted_invoice_url || o.id}` });
  }

  return NextResponse.json({ received: true });
}
