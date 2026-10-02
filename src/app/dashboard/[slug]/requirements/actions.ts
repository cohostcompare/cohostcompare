'use server';

import { revalidatePath } from 'next/cache';
import { requireManager } from '@/lib/managers';
import { requirementsFromForm } from '@/lib/requirementsServer';
import { adminClient } from '@/lib/supabase/server';

export async function saveRequirements(_: { ok?: string; error?: string }, form: FormData) {
  const slug = String(form.get('slug') || '');
  const { manager: m } = await requireManager(slug, `/dashboard/${slug}/requirements`);
  const { error } = await adminClient().from('managers').update({ requirements: requirementsFromForm(form) }).eq('id', m.id);
  if (error) return { error: /requirements/.test(error.message) ? 'Requirements are being switched on. Please try again soon.' : 'We couldn’t save that. Try again in a minute.' };
  revalidatePath(`/dashboard/${slug}/requirements`);
  revalidatePath(`/managers/${slug}`);
  return { ok: 'Saved. Owners whose property doesn’t match won’t be able to send you a request.' };
}
