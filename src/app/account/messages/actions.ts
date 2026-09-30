'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { memberEmails } from '@/lib/managers';
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

  const managerEmails = await memberEmails((await adminClient().from('quote_request_managers').select('manager_slug').eq('id', thread.id).single()).data?.manager_slug || '');
  const h = await headers();
  if (managerEmails.length) {
    await sendEmail({
      to: managerEmails,
      subject: `New message from an owner`,
      text: `An owner wrote about their quote request:\n\n${body}\n\nReply in your dashboard so everything stays in one place.`,
      cta: { label: 'Reply', url: `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}/dashboard/requests/${thread.id}` },
    });
  } else await sendEmail({
    to: 'hello@cohostcompare.com',
    subject: `Owner message for ${thread.manager_name}`,
    text: `From: ${user.email}\nTo manager: ${thread.manager_name}\nThread: ${thread.id}\n\n${body}`,
    replyTo: user.email ?? undefined,
  });

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
  const db = adminClient();
  const { data: req } = await db.from('quote_requests').select('owner_name, owner_email, owner_phone, street, suburb, state, postcode').eq('id', t.request_id).single();
  const { data: m } = await db.from('managers').select('name, website, contact_phone').eq('slug', t.manager_slug).single();
  await db.from('quote_request_managers').update({ status: 'accepted', accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', t.id);
  await db.from('messages').insert({ thread_id: t.id, sender: 'system', read_by_owner: true, body: `You accepted ${t.manager_name}'s quote. Your contact details have been shared with them.` });
  const managerEmails = await memberEmails(t.manager_slug);
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;
  if (managerEmails.length && req) {
    await sendEmail({
      to: managerEmails,
      subject: `${req.owner_name} accepted your quote`,
      text: `Good news: ${req.owner_name} accepted your quote for ${[req.street, req.suburb, `${req.state} ${req.postcode}`].filter(Boolean).join(', ')}.\n\nTheir details:\n${req.owner_name}\n${req.owner_email}${req.owner_phone ? `\n${req.owner_phone}` : ''}\n\nGet in touch to arrange the next steps.`,
      cta: { label: 'Open the request', url: `${origin}/dashboard/requests/${t.id}` },
      replyTo: req.owner_email,
    });
  } else {
    await sendEmail({ to: 'hello@cohostcompare.com', subject: `Accepted quote to pass on: ${t.manager_name}`, text: `${req?.owner_name} <${req?.owner_email}> accepted ${t.manager_name}'s quote (thread ${t.id}). The manager has no dashboard users, so pass the details on by hand.` });
  }
  if (req) {
    await sendEmail({
      to: req.owner_email,
      subject: `You accepted ${t.manager_name}'s quote`,
      text: `We've shared your details with ${t.manager_name}, and they'll be in touch to arrange next steps.\n\nTheir contact details:${managerEmails[0] ? `\nEmail: ${managerEmails[0]}` : ''}${m?.contact_phone ? `\nPhone: ${m.contact_phone}` : ''}${m?.website ? `\nWebsite: ${m.website}` : ''}\n\nThe CoHostCompare team`,
      cta: { label: 'Open my inbox', url: `${origin}/account/messages/${t.id}` },
      replyTo: managerEmails[0],
    });
  }
  revalidatePath(`/account/messages/${t.id}`);
  revalidatePath('/account');
}
