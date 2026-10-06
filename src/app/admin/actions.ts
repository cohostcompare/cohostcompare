'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';

export async function setFeeStatus(form: FormData) {
  await requireAdmin('/admin');
  const status = String(form.get('status') || '');
  if (!['owed', 'invoiced', 'paid', 'waived'].includes(status)) return;
  const id = String(form.get('id') || '');
  if (status === 'waived') {
    if (form.get('confirm') !== 'yes') return; // tick the box first: waiving sends the introduction straight away
    // Waiving a confirmation sends the introduction, as if the manager had paid.
    const { data: f } = await adminClient().from('success_fees').select('thread_id').eq('id', id).maybeSingle();
    const { completeUnlock } = await import('@/lib/intro');
    if (f) await completeUnlock(f.thread_id, 'waived');
  } else await adminClient().from('success_fees').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin');
}

export async function setFlagStatus(form: FormData) {
  await requireAdmin('/admin');
  const status = String(form.get('status') || '');
  if (!['ok', 'actioned'].includes(status)) return;
  await adminClient().from('account_flags').update({ status }).eq('id', String(form.get('id') || ''));
  revalidatePath('/admin');
}

/**
 * Resolving an email failure (SQL 030). Bounces from outreach are matched to the contact by domain.
 * - dismiss: leave everything as it is (the address stays suppressed).
 * - retry: a transient bounce; un-suppress the address and put the contact back in the sequence.
 * - replace: use a different published address for that manager (adds to outreach, old one stays suppressed).
 * - hide: the business is gone or wrong; unpublish the profile and finish its outreach.
 */
export async function resolveEmailFailure(id: string, how: string, form: FormData) {
  await requireAdmin('/admin');
  const db = adminClient();
  const back = (msg: string, kind: 'done' | 'error' = 'done'): never => { redirect(`/admin?${kind}=${encodeURIComponent(msg)}&at=failures#email-failures`); };
  const { data: f } = await db.from('email_failures').select('id, to_domain').eq('id', id).maybeSingle();
  if (!f) return back('That failure is no longer listed.', 'error');
  const domain = (f.to_domain || '').toLowerCase();
  const { data: contacts } = domain ? await db.from('outreach_contacts').select('id, email, manager_id, status').ilike('email', `%@${domain}`) : { data: [] };
  const ct = (contacts || []).find((c) => c.status === 'bounced') || (contacts || [])[0];
  let msg = 'Dismissed.';
  if (how === 'retry') {
    if (!ct) back('No outreach contact matches that address, so there is nothing to retry.', 'error');
    await db.from('email_suppressions').delete().eq('email', ct.email.toLowerCase());
    await db.from('outreach_contacts').update({ status: 'active', next_send_at: new Date().toISOString() }).eq('id', ct.id);
    msg = `${ct.email} is unblocked and back in the sequence: it gets its next email with tomorrow morning's batch.`;
  } else if (how === 'replace') {
    if (!ct) back('No outreach contact matches that address.', 'error');
    const email = String(form.get('email') || '').trim().toLowerCase();
    const source_url = String(form.get('source_url') || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^https?:\/\//.test(source_url)) back('Enter a valid email and the https:// page where it is published.', 'error');
    const { data: existing } = await db.from('outreach_contacts').select('id').eq('manager_id', ct.manager_id).ilike('email', email).maybeSingle();
    if (!existing) await db.from('outreach_contacts').insert({ manager_id: ct.manager_id, email, source_url, first_name: null, step: 0, status: 'active', next_send_at: new Date().toISOString() });
    msg = `${email} added to outreach: email 1 goes with tomorrow morning's batch.`;
  } else if (how === 'hide') {
    if (!ct) back('No outreach contact matches that address.', 'error');
    await db.from('managers').update({ published: false }).eq('id', ct.manager_id);
    await db.from('outreach_contacts').update({ status: 'finished' }).eq('manager_id', ct.manager_id);
    msg = 'Profile hidden and outreach to it stopped.';
  } else if (how !== 'dismiss') back('Unknown action.', 'error');
  await db.from('email_failures').update({ resolved_at: new Date().toISOString(), resolution: how }).eq('id', id);
  revalidatePath('/admin');
  revalidatePath('/admin/outreach');
  back(msg);
}
