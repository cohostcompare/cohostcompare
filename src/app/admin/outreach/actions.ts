'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { sendOutreachBatch, suppressed } from '@/lib/outreach';
import { adminClient } from '@/lib/supabase/server';

const back = (msg: string, kind: 'done' | 'error' = 'done') => redirect(`/admin/outreach?${kind}=${encodeURIComponent(msg)}`);

export async function addContact(form: FormData) {
  await requireAdmin('/admin/outreach');
  const manager_id = String(form.get('manager_id') || '');
  const email = String(form.get('email') || '').trim().toLowerCase();
  const source_url = String(form.get('source_url') || '').trim();
  const first_name = String(form.get('first_name') || '').trim() || null;
  if (!manager_id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back('Pick a manager and enter a valid email.', 'error');
  if (!/^https?:\/\//.test(source_url)) back('Add the web page where this email is published (needed under the Spam Act).', 'error');
  if (await suppressed(email)) back('That address has unsubscribed, so it can’t be added.', 'error');
  const { error } = await adminClient().from('outreach_contacts').insert({ manager_id, email, source_url, first_name });
  if (error) back(error.message, 'error');
  revalidatePath('/admin/outreach');
  back(`Added ${email}. Their first email goes out with the next daily batch.`);
}

export async function setStatus(form: FormData) {
  await requireAdmin('/admin/outreach');
  const status = String(form.get('status'));
  if (!['active', 'paused', 'replied'].includes(status)) back('Unknown status', 'error');
  await adminClient().from('outreach_contacts').update({ status }).eq('id', String(form.get('id')));
  revalidatePath('/admin/outreach');
  back('Updated.');
}

export async function sendNow() {
  await requireAdmin('/admin/outreach');
  const r = await sendOutreachBatch();
  revalidatePath('/admin/outreach');
  back(`Sent ${r.sent} email${r.sent === 1 ? '' : 's'}.${'note' in r && r.note ? ` ${r.note}.` : ''}`);
}
