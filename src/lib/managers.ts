import 'server-only';
import { redirect } from 'next/navigation';
import { adminClient, currentUser } from './supabase/server';

export const SERVICES = ['Listing setup', 'Professional photography', 'Interior styling', 'Dynamic pricing', 'Guest messaging (24/7)', 'Check-in and key handover', 'Cleaning and linen', 'Maintenance coordination', 'Registration and compliance help', 'Owner statements and reporting'];
export const PLATFORMS = ['Airbnb', 'Booking.com', 'Stayz', 'Vrbo', 'Direct booking website', 'Mid-term rental sites'];

export type ManagerRow = {
  id: string; slug: string; name: string; tagline: string | null; about: string | null; website: string | null; contact_phone: string | null;
  platforms: string[]; services: string[]; postcodes: string[]; fee_min: number | null; fee_max: number | null; fee_note: string | null;
  licensed_agent: boolean | null; gated: Record<string, unknown>; logo_url: string | null; photos: string[]; photo_captions?: Record<string, string> | null; claimed: boolean; requirements?: Record<string, unknown> | null;
};

const COLS = 'id, slug, name, tagline, about, website, contact_phone, platforms, services, postcodes, fee_min, fee_max, fee_note, licensed_agent, gated, logo_url, photos, photo_captions, claimed, requirements';

/** Profiles the signed-in user manages. */
export async function myManagers(userId: string): Promise<ManagerRow[]> {
  const db = adminClient();
  const { data: mem } = await db.from('manager_members').select('manager_id').eq('user_id', userId);
  const ids = (mem || []).map((m) => m.manager_id);
  if (!ids.length) return [];
  const { data } = await db.from('managers').select(COLS).in('id', ids).order('name');
  return (data || []) as ManagerRow[];
}

/** Use at the top of manager pages and actions: the user must be a member of this profile. */
export async function requireManager(slug: string, next: string) {
  const user = await currentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  const mine = await myManagers(user.id);
  const m = mine.find((x) => x.slug === slug);
  if (!m) redirect('/dashboard');
  const { recordActivity } = await import('@/lib/activity');
  await recordActivity(user.id);
  return { user, manager: m };
}

/** Email addresses of everyone who manages a profile (for notifications). */
export async function memberEmails(slug: string): Promise<string[]> {
  const db = adminClient();
  const { data: m } = await db.from('managers').select('id').eq('slug', slug).maybeSingle();
  if (!m) return [];
  const { data: mem } = await db.from('manager_members').select('user_id').eq('manager_id', m.id);
  const emails = await Promise.all((mem || []).map(async (x) => (await db.auth.admin.getUserById(x.user_id)).data.user?.email));
  return emails.filter((e): e is string => Boolean(e));
}

/** A manager's thread, checked against the signed-in user's memberships. */
export async function requireThread(threadId: string) {
  const user = await currentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/dashboard/requests/${threadId}`)}`);
  const db = adminClient();
  const { data: t } = await db.from('quote_request_managers')
    .select('id, request_id, manager_slug, manager_name, status, quote, quoted_at, accepted_at, created_at, quote_requests(*)')
    .eq('id', threadId).maybeSingle();
  if (!t) redirect('/dashboard');
  const mine = await myManagers(user.id);
  if (!mine.some((m) => m.slug === t.manager_slug)) redirect('/dashboard');
  const req = (Array.isArray(t.quote_requests) ? t.quote_requests[0] : t.quote_requests) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  return { user, thread: t, req };
}
