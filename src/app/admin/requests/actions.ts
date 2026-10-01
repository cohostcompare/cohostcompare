'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';

/** Permanently deletes a quote request with its manager threads, messages and quotes (all cascade). For test or junk requests. */
export async function deleteRequest(form: FormData) {
  await requireAdmin('/admin/requests');
  if (form.get('confirm') !== 'yes') return;
  await adminClient().from('quote_requests').delete().eq('id', String(form.get('id') || ''));
  revalidatePath('/admin/requests');
  revalidatePath('/admin');
}
