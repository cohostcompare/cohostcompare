'use server';

import { revalidatePath } from 'next/cache';
import { requireManager } from '@/lib/managers';
import { isPro, plansFor } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';

type Tpl = { name: string; q: Record<string, unknown> };
type State = { ok?: string; error?: string };

async function templatesOf(slug: string, next: string) {
  const { manager: m } = await requireManager(slug, next);
  const db = adminClient();
  const { data } = await db.from('managers').select('quote_templates').eq('id', m.id).maybeSingle(); // needs 015
  return { m, db, list: ((data?.quote_templates as Tpl[] | null) || []) };
}

/** Pro: rename a saved quote template (names stay unique). */
export async function renameTemplate(_: State, form: FormData): Promise<State> {
  const slug = String(form.get('slug') || '');
  const from = String(form.get('from') || '');
  const to = String(form.get('to') || '').trim().slice(0, 60);
  const { m, db, list } = await templatesOf(slug, `/dashboard/${slug}/templates`);
  if (!isPro((await plansFor([m.id])).get(m.id))) return { error: 'Quote templates are part of Pro.' };
  if (!to) return { error: 'Give the template a name.' };
  if (!list.some((t) => t.name === from)) return { error: 'That template no longer exists.' };
  if (to !== from && list.some((t) => t.name === to)) return { error: `You already have a template called “${to}”.` };
  const { error } = await db.from('managers').update({ quote_templates: list.map((t) => (t.name === from ? { ...t, name: to } : t)) }).eq('id', m.id);
  if (error) return { error: 'We couldn’t rename the template.' };
  revalidatePath(`/dashboard/${slug}/templates`);
  return { ok: `Renamed to “${to}”.` };
}

export async function deleteTemplate(form: FormData) {
  const slug = String(form.get('slug') || '');
  const name = String(form.get('name') || '');
  const { m, db, list } = await templatesOf(slug, `/dashboard/${slug}/templates`);
  await db.from('managers').update({ quote_templates: list.filter((t) => t.name !== name) }).eq('id', m.id);
  revalidatePath(`/dashboard/${slug}/templates`);
}
