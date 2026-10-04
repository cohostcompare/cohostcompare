'use server';

import { revalidatePath } from 'next/cache';
import { adminClient, currentUser, userClient } from '@/lib/supabase/server';
import { postOwnerMessage } from '@/lib/threads';
import { onAccepted } from '@/lib/intro';

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

  if (!(await postOwnerMessage(thread.id, body, user.email ?? null))) return { error: "Your message didn't send. Try again." };

  revalidatePath(`/account/messages/${thread.id}`);
  return { ok: true };
}

/** Owner accepts a manager's quote: shares contact details both ways. */
export async function acceptQuote(form: FormData) {
  const user = await currentUser();
  if (!user) return;
  const threadId = String(form.get('thread') || '');
  const s = await userClient();
  const { data: t } = await s.from('quote_request_managers').select('id, manager_slug, manager_name, status, quote, request_id').eq('id', threadId).single();
  if (!t || t.status !== 'quoted') return;
  const { data: others } = await adminClient().from('quote_request_managers').select('id').eq('request_id', t.request_id).eq('status', 'accepted').neq('id', t.id).limit(1);
  if (others?.length && form.get('also') !== 'yes') return;
  await adminClient().from('quote_request_managers').update({ status: 'accepted', accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', t.id);
  await onAccepted(t.id);
  revalidatePath(`/account/messages/${t.id}`);
  revalidatePath('/account');
}
