'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { RESEARCHED_CONTACTS } from '@/lib/jobs/contacts';
import { sendOutreachBatch, sendTest, suppressed } from '@/lib/outreach';
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

export async function sendNow(form: FormData) {
  await requireAdmin('/admin/outreach');
  if (form.get('confirm') !== 'yes') back('Tick the box to confirm before sending.', 'error');
  const r = await sendOutreachBatch();
  revalidatePath('/admin/outreach');
  back(`Sent ${r.sent} email${r.sent === 1 ? '' : 's'}.${'note' in r && r.note ? ` ${r.note}.` : ''}`);
}

/** Adds the researched contacts ticked on the review list (unclaimed, visible managers only; skips unsubscribed and existing). */
export async function approveResearched(form: FormData) {
  await requireAdmin('/admin/outreach');
  const picked = new Set(form.getAll('pick').map(String));
  const db = adminClient();
  const { data: mgrs } = await db.from('managers').select('id, slug, claimed, published');
  const bySlug = new Map((mgrs || []).map((m) => [m.slug, m]));
  let added = 0, skipped = 0;
  for (const c of RESEARCHED_CONTACTS) {
    if (!picked.has(`${c.slug}|${c.email}`)) continue;
    const m = bySlug.get(c.slug);
    if (!m || m.claimed || !m.published || await suppressed(c.email)) { skipped++; continue; }
    const { error } = await db.from('outreach_contacts').insert({ manager_id: m.id, email: c.email, source_url: c.source });
    if (error) skipped++; else added++;
  }
  revalidatePath('/admin/outreach');
  back(`Added ${added} contact${added === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped: already added, claimed, hidden or not created yet)` : ''}. Emails start with the next morning's batch.`);
}

export async function testEmail(form: FormData) {
  await requireAdmin('/admin/outreach');
  const ok = await sendTest(String(form.get('manager_id') || ''), Number(form.get('step') || 1) - 1);
  back(ok ? 'Test sent to hello@cohostcompare.com. Check the links, button and wording.' : 'Couldn’t send the test. Pick a visible manager.', ok ? 'done' : 'error');
}
