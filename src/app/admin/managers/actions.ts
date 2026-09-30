'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';

/** Hide a manager from search, profiles and quote requests (e.g. they asked to be removed), or show them again. */
export async function setVisibility(form: FormData) {
  const admin = await requireAdmin('/admin/managers');
  const id = String(form.get('id') || '');
  const show = form.get('show') === '1';
  const reason = String(form.get('reason') || '').trim().slice(0, 500);
  const q = String(form.get('q') || '');
  if (!show && !reason) redirect(`/admin/managers?q=${encodeURIComponent(q)}&error=${encodeURIComponent('Add a short reason before hiding a manager.')}`);
  const db = adminClient();
  const { error } = await db.from('managers').update({ published: show }).eq('id', id);
  if (error) redirect(`/admin/managers?q=${encodeURIComponent(q)}&error=${encodeURIComponent(error.message)}`);
  await db.from('manager_edits').insert({ manager_id: id, user_id: admin.id, changes: { published: show, reason: reason || null, by: 'admin' } });
  revalidatePath('/admin/managers');
  redirect(`/admin/managers?q=${encodeURIComponent(q)}&done=${show ? 'shown' : 'hidden'}`);
}
