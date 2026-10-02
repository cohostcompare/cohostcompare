'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { managersForArea } from '@/lib/data';
import { sendEmail } from '@/lib/email';
import { memberEmails } from '@/lib/managers';
import { adminClient, currentUser } from '@/lib/supabase/server';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';

async function ownRequest(id: string) {
  const user = await currentUser();
  if (!user) redirect('/signin?next=/account');
  const { data: r } = await adminClient().from('quote_requests').select('id, owner_id, owner_name, suburb, postcode, lat, lng').eq('id', id).maybeSingle();
  if (!r || r.owner_id !== user.id) return null;
  return { user, r };
}

/** Owner stops a request: every manager who hasn't been accepted is told, and it closes for them. */
export async function withdrawRequest(form: FormData) {
  const x = await ownRequest(String(form.get('id') || ''));
  if (!x) return;
  const db = adminClient();
  const reason = String(form.get('reason') || '').trim().slice(0, 300);
  const { data: ts } = await db.from('quote_request_managers').select('id, manager_slug, manager_name, status').eq('request_id', x.r.id).in('status', ['sent', 'viewed', 'quoted']);
  for (const t of ts || []) {
    await db.from('quote_request_managers').update({ status: 'withdrawn', updated_at: new Date().toISOString() }).eq('id', t.id);
    await db.from('messages').insert({ thread_id: t.id, sender: 'system', read_by_owner: true, read_by_manager: false, body: `The owner has closed this request${reason ? `: “${reason}”` : '.'} No need to reply.` });
    const to = await memberEmails(t.manager_slug);
    if (to.length) await sendEmail({ to, subject: `Request closed: ${x.r.suburb || x.r.postcode}`, text: `The owner in ${x.r.suburb || ''} ${x.r.postcode} has closed their quote request${reason ? `, saying: “${reason}”` : ''}. There's nothing more you need to do.\n\nThanks for responding. Owners compare reply speed and quotes, so it all counts.`, cta: { label: 'Open your requests', url: `${SITE}/dashboard/requests` } });
  }
  await db.from('quote_requests').update({ watch_new: false }).eq('id', x.r.id).then(() => {}, () => {});
  revalidatePath('/account');
}

/** Turns "email me when new managers cover this property" on or off. */
export async function toggleWatch(form: FormData) {
  const x = await ownRequest(String(form.get('id') || ''));
  if (!x) return;
  const on = form.get('on') === '1';
  const patch: Record<string, unknown> = { watch_new: on, watch_checked_at: new Date().toISOString() };
  if (on && x.r.lat != null && x.r.lng != null) patch.known_slugs = (await managersForArea(Number(x.r.lat), Number(x.r.lng), x.r.postcode)).map((m) => m.slug);
  await adminClient().from('quote_requests').update(patch).eq('id', x.r.id);
  revalidatePath('/account');
}

/** Self-serve account deletion for owners (managers are asked to email us, as their business profile is shared). */
export async function deleteAccount(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) redirect('/signin?next=/account/delete');
  if (String(form.get('confirm') || '').trim().toUpperCase() !== 'DELETE') return { error: 'Type DELETE to confirm.' };
  const db = adminClient();
  const { count } = await db.from('manager_members').select('manager_id', { count: 'exact', head: true }).eq('user_id', user.id);
  if (count) return { error: 'This login also manages a business profile. Email hello@cohostcompare.com and we’ll remove you from the business and delete your account.' };
  const email = user.email || '';
  const { error } = await db.auth.admin.deleteUser(user.id); // requests, messages and reviews are removed with the account
  if (error) return { error: 'We couldn’t delete your account just now. Email hello@cohostcompare.com and we’ll do it for you.' };
  await db.from('email_suppressions').upsert({ email: email.toLowerCase(), reason: 'account deleted' }).then(() => {}, () => {});
  if (email) await sendEmail({ to: email, subject: 'Your CoHostCompare account has been deleted', text: `Hi,\n\nAs you asked, we've deleted your CoHostCompare account, along with your quote requests and messages. Managers you were introduced to keep the details you shared with them, as their own records.\n\nYou're welcome back any time.\n\nThe CoHostCompare team` });
  await sendEmail({ to: 'hello@cohostcompare.com', subject: 'Owner deleted their account', text: `${email} deleted their account (self-serve).` });
  const { userClient } = await import('@/lib/supabase/server');
  await (await userClient()).auth.signOut().catch(() => {});
  redirect('/?deleted=1');
}
