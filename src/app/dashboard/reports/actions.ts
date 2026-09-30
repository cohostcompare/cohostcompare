'use server';

import { revalidatePath } from 'next/cache';
import { requireManager } from '@/lib/managers';
import { planOf, plansFor, PRO_FOLLOW_LIMIT } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';

/** Pro managers can follow up to PRO_FOLLOW_LIMIT extra areas; Enterprise sees every area anyway. */
export async function setFollow(form: FormData) {
  const slug = String(form.get('slug') || '');
  const { manager: m } = await requireManager(slug, '/dashboard/reports');
  if (planOf((await plansFor([m.id])).get(m.id)) !== 'pro') return;
  const follow = form.getAll('area').map(String).filter(Boolean).slice(0, PRO_FOLLOW_LIMIT);
  await adminClient().from('managers').update({ report_follow: follow }).eq('id', m.id);
  revalidatePath('/dashboard/reports');
}
