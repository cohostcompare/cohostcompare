'use server';

import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';
import { adminClient, currentUser, userClient } from '@/lib/supabase/server';

export async function sendOwnerMessage(_: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const user = await currentUser();
  if (!user) return { error: 'Your sign-in has expired. Refresh and sign in again.' };
  const threadId = String(form.get('thread') || '');
  const body = String(form.get('body') || '').trim();
  if (!body) return { error: 'Write a message first.' };
  if (body.length > 4000) return { error: 'Keep messages under 4,000 characters.' };

  // Confirm the thread belongs to this owner (row-level security does the check).
  const s = await userClient();
  const { data: thread } = await s.from('quote_request_managers').select('id, manager_name, request_id').eq('id', threadId).single();
  if (!thread) return { error: "We couldn't find that conversation." };

  const { error } = await adminClient().from('messages').insert({ thread_id: thread.id, sender: 'owner', body, read_by_owner: true });
  if (error) { console.error(error); return { error: "Your message didn't send. Try again." }; }

  // Until managers are onboarded, we relay owner messages by hand.
  await sendEmail({
    to: 'hello@cohostcompare.com',
    subject: `Owner message for ${thread.manager_name}`,
    text: `From: ${user.email}\nTo manager: ${thread.manager_name}\nThread: ${thread.id}\n\n${body}`,
    replyTo: user.email ?? undefined,
  });

  revalidatePath(`/account/messages/${thread.id}`);
  return { ok: true };
}
