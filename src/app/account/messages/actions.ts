'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { memberEmails } from '@/lib/managers';
import { sendEmail } from '@/lib/email';
import { adminClient, currentUser, userClient } from '@/lib/supabase/server';
import { postOwnerMessage } from '@/lib/threads';
import { smsManager } from '@/lib/sms';
import { planOf, plansFor, SUCCESS_FEE, SUCCESS_FEE_TEXT } from '@/lib/pro';

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
  const db = adminClient();
  const { data: req } = await db.from('quote_requests').select('owner_name, owner_email, owner_phone, street, suburb, state, postcode').eq('id', t.request_id).single();
  const { data: m } = await db.from('managers').select('id, name, website, contact_phone, claimed').eq('slug', t.manager_slug).single();
  await db.from('quote_request_managers').update({ status: 'accepted', accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', t.id);
  await db.from('messages').insert({ thread_id: t.id, sender: 'system', read_by_owner: true, body: `You accepted ${t.manager_name}'s quote. Your contact details have been shared with them.` });
  // Free plan: success fee when an owner accepts (claimed managers only; they agreed to the terms when claiming).
  let feeLine = '';
  if (m?.claimed && planOf((await plansFor([m.id])).get(m.id)) === 'free') {
    const { error: feeErr } = await db.from('success_fees').insert({ manager_id: m.id, thread_id: t.id, amount: SUCCESS_FEE });
    if (!feeErr) {
      feeLine = `\n\nYou're on the Free plan, so a ${SUCCESS_FEE_TEXT} success fee applies to this client. We'll email you an invoice. Pro has no success fees.`;
      await sendEmail({ to: 'hello@cohostcompare.com', subject: `Success fee to invoice: ${m.name}`, text: `${m.name} (Free plan) had a quote accepted (thread ${t.id}). Invoice ${SUCCESS_FEE_TEXT}. Track it on the admin page.` });
    }
  }
  const managerEmails = await memberEmails(t.manager_slug);
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;
  if (req) await smsManager(t.manager_slug, 'accepted', `CoHostCompare: ${String(req.owner_name || 'An owner').split(' ')[0]} accepted your quote for ${req.suburb || req.postcode}. Their details are in your dashboard: ${origin}/dashboard/requests/${t.id}`);
  if (managerEmails.length && req) {
    await sendEmail({
      to: managerEmails,
      subject: `${req.owner_name} accepted your quote`,
      text: `Good news: ${req.owner_name} accepted your quote for ${[req.street, req.suburb, `${req.state} ${req.postcode}`].filter(Boolean).join(', ')}.\n\nTheir details:\n${req.owner_name}\n${req.owner_email}${req.owner_phone ? `\n${req.owner_phone}` : ''}\n\nGet in touch to arrange the next steps.${feeLine}`,
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
