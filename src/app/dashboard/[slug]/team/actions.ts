'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendEmail } from '@/lib/email';
import { requireManager } from '@/lib/managers';
import { planOf, plansFor, SEATS } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
type State = { ok?: string; error?: string };

export async function seatsUsed(managerId: string) {
  const db = adminClient();
  const [{ count: members }, { count: invites }] = await Promise.all([
    db.from('manager_members').select('user_id', { count: 'exact', head: true }).eq('manager_id', managerId),
    db.from('manager_invites').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).is('accepted_at', null),
  ]);
  return (members ?? 0) + (invites ?? 0);
}

export async function invite(_: State, form: FormData): Promise<State> {
  const slug = String(form.get('slug') || '');
  const { user, manager: m } = await requireManager(slug, `/dashboard/${slug}/team`);
  const email = String(form.get('email') || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };
  const plan = planOf((await plansFor([m.id])).get(m.id));
  if ((await seatsUsed(m.id)) >= SEATS[plan]) return { error: plan === 'free' ? 'The Free plan includes 1 login. Pro includes up to 3.' : `Your plan includes ${SEATS[plan]} logins, and they're all in use.` };
  const { data: inv, error } = await adminClient().from('manager_invites').insert({ manager_id: m.id, email, invited_by: user.id }).select('id').single();
  if (error || !inv) return { error: 'We couldn’t send the invite. Try again in a minute.' };
  await sendEmail({
    to: email, subject: `Join ${m.name} on CoHostCompare`,
    text: `Hi,\n\n${user.email} has invited you to help manage ${m.name}'s profile and quote requests on CoHostCompare.\n\nSign in with this email address (${email}) to accept.\n\nThe CoHostCompare team`,
    cta: { label: 'Accept the invite', url: `${SITE}/join?i=${inv.id}` },
  });
  revalidatePath(`/dashboard/${slug}/team`);
  return { ok: `Invite sent to ${email}.` };
}

/** The signed-in user's role on a profile: 'owner' (claimed it, or was made owner) or 'member' (invited). */
export async function memberRole(managerId: string, userId: string): Promise<'owner' | 'member'> {
  const { data } = await adminClient().from('manager_members').select('role').eq('manager_id', managerId).eq('user_id', userId).maybeSingle();
  return data?.role === 'owner' ? 'owner' : 'member';
}

/** Owners can remove anyone else and cancel invites. Members can only remove themselves. */
export async function removeMember(form: FormData) {
  const slug = String(form.get('slug') || '');
  const { user, manager: m } = await requireManager(slug, `/dashboard/${slug}/team`);
  const id = String(form.get('user') || '');
  const inviteId = String(form.get('invite') || '');
  const db = adminClient();
  const owner = (await memberRole(m.id, user.id)) === 'owner';
  if (inviteId && owner) await db.from('manager_invites').delete().eq('id', inviteId).eq('manager_id', m.id);
  if (id && id !== user.id && owner) await db.from('manager_members').delete().eq('manager_id', m.id).eq('user_id', id);
  if (id && id === user.id && !owner) { await db.from('manager_members').delete().eq('manager_id', m.id).eq('user_id', id); redirect('/dashboard'); }
  revalidatePath(`/dashboard/${slug}/team`);
}
