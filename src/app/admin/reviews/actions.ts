'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';

export async function setReviewStatus(form: FormData) {
  await requireAdmin('/admin/reviews');
  const status = String(form.get('status')) === 'hidden' ? 'hidden' : 'published';
  const db = adminClient();
  const { data } = await db.from('manager_reviews').update({ status, hidden_reason: status === 'hidden' ? String(form.get('reason') || '').slice(0, 300) || null : null, updated_at: new Date().toISOString() })
    .eq('id', String(form.get('id') || '')).select('manager_slug').maybeSingle();
  revalidatePath('/admin/reviews');
  if (data) revalidatePath(`/managers/${data.manager_slug}`);
}
