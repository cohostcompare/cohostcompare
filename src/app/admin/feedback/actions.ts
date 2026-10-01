'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';

export async function setFeedbackReward(form: FormData) {
  await requireAdmin('/admin/feedback');
  const status = String(form.get('status') || '');
  if (!['sent', 'granted', 'to_send', 'manual', 'none'].includes(status)) return;
  await adminClient().from('feedback').update({ reward_status: status, admin_note: String(form.get('note') || '').slice(0, 500) || null }).eq('id', String(form.get('id') || ''));
  revalidatePath('/admin/feedback');
}
