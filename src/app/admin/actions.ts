'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';

export async function setFeeStatus(form: FormData) {
  await requireAdmin('/admin');
  const status = String(form.get('status') || '');
  if (!['owed', 'invoiced', 'paid', 'waived'].includes(status)) return;
  await adminClient().from('success_fees').update({ status, updated_at: new Date().toISOString() }).eq('id', String(form.get('id') || ''));
  revalidatePath('/admin');
}

export async function setFlagStatus(form: FormData) {
  await requireAdmin('/admin');
  const status = String(form.get('status') || '');
  if (!['ok', 'actioned'].includes(status)) return;
  await adminClient().from('account_flags').update({ status }).eq('id', String(form.get('id') || ''));
  revalidatePath('/admin');
}
