import 'server-only';
import { adminClient } from '@/lib/supabase/server';

/*
 Owner reviews of managers (SQL 017). Verified by design: only an owner who accepted that manager's quote
 through CoHostCompare, and has been introduced, can review it, once per quote (they can edit it later).
 Published straight away; admin can hide a review that breaks the guidelines (/admin/reviews).
 Managers can reply once, publicly. Reviews never change search order, and nobody can pay to remove one.
 Nothing shows on a profile or card until a manager has at least one published review.
*/

export type Review = { id: string; created_at: string; rating: number; body: string; owner_first: string | null; suburb: string | null; manager_reply: string | null; replied_at: string | null };
export type ReviewSummary = { avg: number; count: number };

export const MIN_REVIEW = 30;

/** Published-review average and count per manager slug. Empty map if 017 hasn't been run. */
export async function reviewSummaries(slugs: string[]): Promise<Map<string, ReviewSummary>> {
  const out = new Map<string, ReviewSummary>();
  if (!slugs.length) return out;
  const { data, error } = await adminClient().from('manager_reviews').select('manager_slug, rating').in('manager_slug', slugs.slice(0, 300)).eq('status', 'published');
  if (error) return out;
  const acc = new Map<string, number[]>();
  for (const r of data || []) acc.set(r.manager_slug, [...(acc.get(r.manager_slug) || []), r.rating]);
  for (const [slug, rs] of acc) out.set(slug, { avg: rs.reduce((a, b) => a + b, 0) / rs.length, count: rs.length });
  return out;
}

/** Adds `ownerReviews` to each manager that has any. */
export async function withReviewSummaries<T extends { slug: string }>(list: T[]): Promise<(T & { ownerReviews?: ReviewSummary })[]> {
  const s = await reviewSummaries(list.map((m) => m.slug));
  return list.map((m) => (s.has(m.slug) ? { ...m, ownerReviews: s.get(m.slug) } : m));
}

export async function publishedReviews(slug: string): Promise<Review[]> {
  const { data, error } = await adminClient().from('manager_reviews').select('id, created_at, rating, body, owner_first, suburb, manager_reply, replied_at').eq('manager_slug', slug).eq('status', 'published').order('created_at', { ascending: false }).limit(100);
  return error ? [] : (data as Review[]);
}

/** Whether this owner can review this thread now, and their existing review if any. */
export async function reviewable(threadId: string, ownerId: string) {
  const db = adminClient();
  const { data: t } = await db.from('quote_request_managers').select('id, manager_slug, manager_name, status, quote_requests!inner(owner_id, owner_name, suburb)').eq('id', threadId).maybeSingle();
  const req = t ? (Array.isArray(t.quote_requests) ? t.quote_requests[0] : t.quote_requests) as { owner_id: string; owner_name: string; suburb: string | null } : null;
  if (!t || !req || req.owner_id !== ownerId) return null;
  if (t.status !== 'accepted') return { ok: false as const, reason: 'You can review a manager once you’ve accepted their quote.', t, req };
  const { data: fee } = await db.from('success_fees').select('status').eq('thread_id', threadId).maybeSingle();
  if (fee && ['awaiting_unlock', 'expired'].includes(fee.status)) return { ok: false as const, reason: 'You can review this manager once we’ve introduced you.', t, req };
  const { data: existing, error } = await db.from('manager_reviews').select('id, rating, body, status').eq('thread_id', threadId).maybeSingle();
  if (error) return { ok: false as const, reason: 'Reviews are being switched on. Please try again soon.', t, req };
  return { ok: true as const, t, req, existing };
}

export const stars = (n: number) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
