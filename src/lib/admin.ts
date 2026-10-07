import 'server-only';
import { redirect } from 'next/navigation';
import { currentUser } from './supabase/server';

// Who can open /admin. Set ADMIN_EMAILS in Vercel (comma-separated) to change it.
export const ADMINS = (process.env.ADMIN_EMAILS || 'hello@cohostcompare.com,ben.deeley@outlook.com')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

export function isAdminEmail(email?: string | null) {
  return Boolean(email && ADMINS.includes(email.toLowerCase()));
}

/** Use at the top of every admin page and action. */
export async function requireAdmin(next = '/admin') {
  const user = await currentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  if (!isAdminEmail(user.email)) redirect('/');
  return user;
}

/** True when the signed-in viewer is an admin (never throws). */
export async function isAdminViewer() {
  try { return isAdminEmail((await currentUser())?.email); } catch { return false; }
}
