'use server';

import { revalidatePath } from 'next/cache';
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
