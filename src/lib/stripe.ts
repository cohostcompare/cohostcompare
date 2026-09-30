import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { GST, PRO_CENTS, SUCCESS_FEE } from '@/lib/pro';

/*
 Stripe billing, called over its REST API (no SDK).
 - Free-plan unlock: one-off Checkout payment (A$99 + GST) when an owner accepts a quote.
 - Pro: monthly subscription through Checkout; managers manage card and cancel in Stripe's billing portal.
 Vercel env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET. Webhook URL: /api/stripe.
*/

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
export const stripeOn = () => Boolean((process.env.STRIPE_SECRET_KEY || '').trim());

function form(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? out.push(...form(x as Record<string, unknown>, `${key}[${i}]`)) : out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(x))}`)));
    else if (typeof v === 'object') out.push(...form(v as Record<string, unknown>, key));
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}

export async function stripe<T = Record<string, unknown>>(path: string, params?: Record<string, unknown>, method: 'GET' | 'POST' = params ? 'POST' : 'GET'): Promise<T> {
  const r = await fetch(`https://api.stripe.com/v1${path}${method === 'GET' && params ? `?${form(params).join('&')}` : ''}`, {
    method,
    headers: { Authorization: `Bearer ${(process.env.STRIPE_SECRET_KEY || '').trim()}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'POST' && params ? form(params).join('&') : undefined,
    cache: 'no-store',
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${j?.error?.message || 'error'}`);
  return j as T;
}

let gstRateId: string | null = null;
/** The 10% GST tax rate (exclusive), created once in Stripe if it doesn't exist. Null when not registered for GST. */
async function gstRate() {
  if (!GST) return null;
  if (gstRateId) return gstRateId;
  const { data } = await stripe<{ data: { id: string; display_name: string; percentage: number; inclusive: boolean; active: boolean }[] }>('/tax_rates', { limit: 100, active: true }, 'GET');
  const hit = data.find((t) => t.display_name === 'GST' && t.percentage === 10 && !t.inclusive);
  gstRateId = hit?.id || (await stripe<{ id: string }>('/tax_rates', { display_name: 'GST', percentage: 10, inclusive: false, country: 'AU', jurisdiction: 'AU', description: 'Australian GST' })).id;
  return gstRateId;
}

/** Checkout for unlocking one accepted owner (Free plan). */
export async function unlockCheckout(o: { feeId: string; threadId: string; managerId: string; customerId?: string | null; email: string; where: string }) {
  const tax = await gstRate();
  const s = await stripe<{ id: string; url: string }>('/checkout/sessions', {
    mode: 'payment',
    ...(o.customerId ? { customer: o.customerId } : { customer_email: o.email, customer_creation: 'always' }),
    line_items: [{ quantity: 1, price_data: { currency: 'aud', unit_amount: SUCCESS_FEE * 100, product_data: { name: `Client introduction: ${o.where}`.slice(0, 120) } }, ...(tax ? { tax_rates: [tax] } : {}) }],
    invoice_creation: { enabled: true },
    metadata: { kind: 'unlock', fee_id: o.feeId, thread_id: o.threadId, manager_id: o.managerId },
    success_url: `${SITE}/dashboard/requests/${o.threadId}?unlocked=1`,
    cancel_url: `${SITE}/dashboard/requests/${o.threadId}`,
  });
  return s;
}

/** Checkout for a Pro subscription. A founding trial carries over, so billing starts when it ends. */
export async function proCheckout(o: { managerId: string; slug: string; customerId?: string | null; email: string; trialEnd?: string | null }) {
  const tax = await gstRate();
  const trial = o.trialEnd ? Math.floor(new Date(o.trialEnd).getTime() / 1000) : 0;
  return stripe<{ id: string; url: string }>('/checkout/sessions', {
    mode: 'subscription',
    ...(o.customerId ? { customer: o.customerId } : { customer_email: o.email }),
    line_items: [{ quantity: 1, price_data: { currency: 'aud', unit_amount: PRO_CENTS, recurring: { interval: 'month' }, product_data: { name: 'CoHostCompare Pro' } }, ...(tax ? { tax_rates: [tax] } : {}) }],
    subscription_data: { metadata: { manager_id: o.managerId }, ...(trial > Date.now() / 1000 + 3600 ? { trial_end: trial } : {}) },
    metadata: { kind: 'pro', manager_id: o.managerId },
    success_url: `${SITE}/dashboard?pro=1`,
    cancel_url: `${SITE}/dashboard`,
  });
}

export async function billingPortal(customerId: string) {
  return stripe<{ url: string }>('/billing_portal/sessions', { customer: customerId, return_url: `${SITE}/dashboard` });
}

/** Verifies the Stripe-Signature header (t=..., v1=...) against the raw body. */
export function verifyStripe(raw: string, header: string | null) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]).filter((p) => p.length === 2));
  const sigs = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}
