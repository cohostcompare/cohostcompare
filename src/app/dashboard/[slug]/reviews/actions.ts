'use server';

import { revalidatePath } from 'next/cache';
import { requireManager } from '@/lib/managers';
import { adminClient } from '@/lib/supabase/server';

export async function replyToReview(form: FormData) {
  const slug = String(form.get('slug') || '');
  await requireManager(slug, `/dashboard/${slug}/reviews`);
  const reply = String(form.get('reply') || '').trim().slice(0, 2000);
  await adminClient().from('manager_reviews').update({ manager_reply: reply || null, replied_at: reply ? new Date().toISOString() : null })
    .eq('id', String(form.get('id') || '')).eq('manager_slug', slug);
  revalidatePath(`/dashboard/${slug}/reviews`);
  revalidatePath(`/managers/${slug}`);
}
