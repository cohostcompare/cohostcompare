import 'server-only';
import { sendEmail } from '@/lib/email';
import { replyHint, threadReplyTo } from '@/lib/inbound';
import { memberEmails } from '@/lib/managers';
import { smsManager } from '@/lib/sms';
import { adminClient } from '@/lib/supabase/server';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';

/** Saves an owner's message on a thread and tells the manager (or hello@ if nobody has claimed it). */
export async function postOwnerMessage(threadId: string, body: string, ownerEmail: string | null, via: 'site' | 'email' = 'site') {
  const db = adminClient();
  const { data: t } = await db.from('quote_request_managers').select('id, manager_slug, manager_name').eq('id', threadId).single();
  if (!t) return false;
  const { error } = await db.from('messages').insert({ thread_id: t.id, sender: 'owner', body, read_by_owner: true });
  if (error) { console.error(error); return false; }
  const to = await memberEmails(t.manager_slug);
  if (to.length) {
    await sendEmail({
      to, subject: 'New message from an owner',
      text: `An owner wrote about their quote request${via === 'email' ? ' (by email)' : ''}:\n\n${body}\n\n${replyHint()}`,
      cta: { label: 'Reply', url: `${SITE}/dashboard/requests/${t.id}` },
      replyTo: threadReplyTo(t.id, 'm'),
    });
    await smsManager(t.manager_slug, 'message', `CoHostCompare: new message from an owner about their quote request. Reply: ${SITE}/dashboard/requests/${t.id}`);
  } else {
    await sendEmail({
      to: 'hello@cohostcompare.com', subject: `Owner message for ${t.manager_name}`,
      text: `From: ${ownerEmail || 'owner'}\nTo manager: ${t.manager_name}\nThread: ${t.id}\n\n${body}`,
      replyTo: ownerEmail || undefined,
    });
  }
  return true;
}

/** Saves a manager's message on a thread and tells the owner. */
export async function postManagerMessage(threadId: string, body: string, via: 'site' | 'email' = 'site') {
  const db = adminClient();
  const { data: t } = await db.from('quote_request_managers').select('id, manager_name, status, request_id').eq('id', threadId).single();
  if (!t) return false;
  const { data: req } = await db.from('quote_requests').select('owner_email').eq('id', t.request_id).single();
  const { error } = await db.from('messages').insert({ thread_id: t.id, sender: 'manager', body, read_by_manager: true });
  if (error) { console.error(error); return false; }
  if (t.status === 'sent') await db.from('quote_request_managers').update({ status: 'viewed' }).eq('id', t.id);
  if (req?.owner_email) {
    await sendEmail({
      to: req.owner_email, subject: `New message from ${t.manager_name}`,
      text: `${t.manager_name} wrote${via === 'email' ? ' (by email)' : ''}:\n\n${body}\n\n${replyHint()}`,
      cta: { label: 'Reply', url: `${SITE}/account/messages/${t.id}` },
      replyTo: threadReplyTo(t.id, 'o'),
    });
  }
  return true;
}
