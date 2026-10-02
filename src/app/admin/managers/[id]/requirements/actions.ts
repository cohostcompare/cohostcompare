'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { requirementsFromForm } from '@/lib/requirementsServer';
import { adminClient } from '@/lib/supabase/server';

/** Admin sets a manager's requirements on their behalf. */
export async function adminSaveRequirements(_: { ok?: string; error?: string }, form: FormData) {
  const admin = await requireAdmin('/admin/managers');
  const id = String(form.get('id') || '');
  const r = requirementsFromForm(form);
  const db = adminClient();
  const { data, error } = await db.from('managers').update({ requirements: r }).eq('id', id).select('slug').maybeSingle();
  if (error || !data) return { error: error?.message || 'Manager not found.' };
  await db.from('manager_edits').insert({ manager_id: id, user_id: admin.id, changes: { requirements: r, by: 'admin' } }).then(() => {}, () => {});
  revalidatePath(`/managers/${data.slug}`);
  return { ok: 'Saved.' };
}
