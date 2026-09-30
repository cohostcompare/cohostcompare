'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { sendEmail } from '@/lib/email';
import { requireThread } from '@/lib/managers';
import { parseQuote } from '@/lib/quotes';
import { adminClient } from '@/lib/supabase/server';

async function origin() {
  const h = await headers();
  return `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;
}

export async function sendQuote(_: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const { thread, req } = await requireThread(String(form.get('thread') || ''));
  if (['accepted', 'declined', 'withdrawn'].includes(thread.status)) return { error: 'This request is closed, so the quote can’t be changed.' };
  const q = parseQuote(form);
  if ('error' in q) return q;
  const db = adminClient();
  const first = !thread.quote;
  const { error } = await db.from('quote_request_managers').update({ quote: q, status: 'quoted', quoted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', thread.id);
  if (error) { console.error(error); return { error: "We couldn't save your quote. Try again in a minute." }; }
  await db.from('messages').insert({ thread_id: thread.id, sender: 'system', read_by_manager: true, body: `${thread.manager_name} ${first ? 'sent' : 'updated'} their quote: ${q.feePct}%${q.gst ? ' + GST' : ''} management fee, ${q.setupFee ? `A$${q.setupFee} setup` : 'no setup fee'}, ${q.minTermMonths ? `${q.minTermMonths}-month minimum term` : 'no lock-in'}.` });
  await sendEmail({
    to: req.owner_email,
    subject: `${thread.manager_name} ${first ? 'sent you a quote' : 'updated their quote'}`,
    text: `Hi ${String(req.owner_name || '').split(' ')[0] || 'there'},\n\n${thread.manager_name} has ${first ? 'sent a quote' : 'updated their quote'} for ${req.suburb || `postcode ${req.postcode}`}: ${q.feePct}%${q.gst ? ' + GST' : ''} management fee, ${q.setupFee ? `A$${q.setupFee} setup fee` : 'no setup fee'}, ${q.minTermMonths ? `${q.minTermMonths}-month minimum term` : 'no lock-in'}.\n\nCompare it side by side with your other quotes in your inbox.\n\nThe CoHostCompare team`,
    cta: { label: 'Compare quotes', url: `${await origin()}/account` },
  });
  revalidatePath(`/dashboard/requests/${thread.id}`);
  return { ok: true };
}

export async function sendManagerMessage(_: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const { thread, req } = await requireThread(String(form.get('thread') || ''));
  const body = String(form.get('body') || '').trim();
  if (!body) return { error: 'Write a message first.' };
  if (body.length > 4000) return { error: 'Keep messages under 4,000 characters.' };
  const db = adminClient();
  const { error } = await db.from('messages').insert({ thread_id: thread.id, sender: 'manager', body, read_by_manager: true });
  if (error) { console.error(error); return { error: "Your message didn't send. Try again." }; }
  if (thread.status === 'sent') await db.from('quote_request_managers').update({ status: 'viewed' }).eq('id', thread.id);
  await sendEmail({
    to: req.owner_email,
    subject: `New message from ${thread.manager_name}`,
    text: `${thread.manager_name} wrote:\n\n${body}\n\nReply in your inbox so everything stays in one place.`,
    cta: { label: 'Reply', url: `${await origin()}/account/messages/${thread.id}` },
  });
  revalidatePath(`/dashboard/requests/${thread.id}`);
  return { ok: true };
}

export async function declineRequest(form: FormData) {
  const { thread, req } = await requireThread(String(form.get('thread') || ''));
  const db = adminClient();
  await db.from('quote_request_managers').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', thread.id);
  const reason = String(form.get('reason') || '').trim().slice(0, 500);
  await db.from('messages').insert({ thread_id: thread.id, sender: 'system', read_by_manager: true, body: `${thread.manager_name} can’t take on this property.${reason ? ` They said: “${reason}”` : ''}` });
  await sendEmail({
    to: req.owner_email,
    subject: `${thread.manager_name} can’t take on your property`,
    text: `${thread.manager_name} has let you know they can’t take on your property at ${req.suburb || `postcode ${req.postcode}`}.${reason ? `\n\nThey said: “${reason}”` : ''}\n\nYour other quote requests are unaffected, and you can request quotes from more managers any time.`,
    cta: { label: 'Open my inbox', url: `${await origin()}/account` },
  });
  revalidatePath(`/dashboard/requests/${thread.id}`);
}
