'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { sendEmail } from '@/lib/email';
import { requireThread } from '@/lib/managers';
import { parseQuote } from '@/lib/quotes';
import { notifyIfAllReplied } from '@/lib/reminders';
import { adminClient } from '@/lib/supabase/server';
import { isPro, plansFor } from '@/lib/pro';
import { threadReplyTo } from '@/lib/inbound';
import { postManagerMessage } from '@/lib/threads';

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
  // A new or changed quote counts as unseen again (columns from 008; ignore if not run yet).
  await db.from('quote_request_managers').update({ owner_seen_at: null, owner_reminded_at: null }).eq('id', thread.id);
  await db.from('messages').insert({ thread_id: thread.id, sender: 'system', read_by_manager: true, body: `${thread.manager_name} ${first ? 'sent' : 'updated'} their quote: ${q.feePct}%${q.gst ? ' + GST' : ''} management fee, ${q.setupFee ? `A$${q.setupFee} setup` : 'no setup fee'}, ${q.minTermMonths ? `${q.minTermMonths}-month minimum term` : 'no lock-in'}.` });
  const site = await origin();
  if (first && await notifyIfAllReplied(thread.request_id, site)) { revalidatePath(`/dashboard/requests/${thread.id}`); return { ok: true }; }
  await sendEmail({
    to: req.owner_email,
    subject: `${thread.manager_name} ${first ? 'sent you a quote' : 'updated their quote'}`,
    text: `Hi ${String(req.owner_name || '').split(' ')[0] || 'there'},\n\n${thread.manager_name} has ${first ? 'sent a quote' : 'updated their quote'} for ${req.suburb || `postcode ${req.postcode}`}: ${q.feePct}%${q.gst ? ' + GST' : ''} management fee, ${q.setupFee ? `A$${q.setupFee} setup fee` : 'no setup fee'}, ${q.minTermMonths ? `${q.minTermMonths}-month minimum term` : 'no lock-in'}.\n\nSign in to see the full quote, compare it side by side with any others, ask questions or accept it.\n\nThe CoHostCompare team`,
    cta: { label: 'Review the quote', url: `${site}/account` },
    replyTo: threadReplyTo(thread.id, 'o'),
  });
  revalidatePath(`/dashboard/requests/${thread.id}`);
  return { ok: true };
}

export async function sendManagerMessage(_: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const { thread, req } = await requireThread(String(form.get('thread') || ''));
  const body = String(form.get('body') || '').trim();
  if (!body) return { error: 'Write a message first.' };
  if (body.length > 4000) return { error: 'Keep messages under 4,000 characters.' };
  if (!(await postManagerMessage(thread.id, body))) return { error: "Your message didn't send. Try again." };
  revalidatePath(`/dashboard/requests/${thread.id}`);
  return { ok: true };
}

export async function declineRequest(form: FormData) {
  const { thread, req } = await requireThread(String(form.get('thread') || ''));
  const db = adminClient();
  await db.from('quote_request_managers').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', thread.id);
  const reason = String(form.get('reason') || '').trim().slice(0, 500);
  await db.from('messages').insert({ thread_id: thread.id, sender: 'system', read_by_manager: true, body: `${thread.manager_name} can’t take on this property.${reason ? ` They said: “${reason}”` : ''}` });
  if (await notifyIfAllReplied(thread.request_id, await origin())) { revalidatePath(`/dashboard/requests/${thread.id}`); return; }
  await sendEmail({
    to: req.owner_email,
    subject: `${thread.manager_name} can’t take on your property`,
    text: `${thread.manager_name} has let you know they can’t take on your property at ${req.suburb || `postcode ${req.postcode}`}.${reason ? `\n\nThey said: “${reason}”` : ''}\n\nYour other quote requests are unaffected, and you can request quotes from more managers any time.`,
    cta: { label: 'Open my inbox', url: `${await origin()}/account` },
  });
  revalidatePath(`/dashboard/requests/${thread.id}`);
}

/** Pro: save the quote form as a reusable template (max 10 per business). */
export async function saveTemplate(_: unknown, form: FormData): Promise<{ error?: string; ok?: string }> {
  const { thread } = await requireThread(String(form.get('thread') || ''));
  const name = String(form.get('template_name') || '').trim().slice(0, 60);
  if (!name) return { error: 'Give the template a name.' };
  const db = adminClient();
  const { data: m } = await db.from('managers').select('id, quote_templates').eq('slug', thread.manager_slug).single();
  if (!m) return { error: 'Something went wrong.' };
  if (!isPro((await plansFor([m.id])).get(m.id))) return { error: 'Quote templates are part of Pro.' };
  const q = parseQuote(form);
  if ('error' in q) return q;
  const { estNightlyRate: _r, estOccupancyPct: _o, ...rest } = q as Record<string, unknown>; // property-specific estimates aren't saved
  const list = ((m.quote_templates as { name: string }[]) || []).filter((t) => t.name !== name);
  const { error } = await db.from('managers').update({ quote_templates: [...list, { name, q: rest }].slice(-10) }).eq('id', m.id);
  if (error) return { error: 'We couldn’t save the template.' };
  revalidatePath(`/dashboard/requests/${thread.id}`);
  return { ok: `Saved “${name}”.` };
}
