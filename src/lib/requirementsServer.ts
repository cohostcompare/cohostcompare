import 'server-only';
import { adminClient } from '@/lib/supabase/server';
import { cleanRequirements, type Requirements } from '@/lib/requirements';

/** Requirements per manager slug (empty map if SQL 021 hasn't been run). */
export async function requirementsFor(slugs: string[]): Promise<Map<string, Requirements>> {
  const out = new Map<string, Requirements>();
  if (!slugs.length) return out;
  const { data, error } = await adminClient().from('managers').select('slug, requirements').in('slug', slugs.slice(0, 300)).not('requirements', 'is', null);
  if (error) return out;
  for (const r of data || []) { const c = cleanRequirements(r.requirements as Requirements); if (c) out.set(r.slug, c); }
  return out;
}

export async function withRequirements<T extends { slug: string }>(list: T[]): Promise<(T & { requirements?: Requirements })[]> {
  const m = await requirementsFor(list.map((x) => x.slug));
  return list.map((x) => (m.has(x.slug) ? { ...x, requirements: m.get(x.slug) } : x));
}

/** Reads the requirements form (dashboard and admin share it). */
export function requirementsFromForm(f: FormData): Requirements | null {
  return cleanRequirements({
    minMonths: Number(f.get('minMonths')) || null,
    types: f.getAll('types').map(String),
    minBeds: f.get('minBeds') === '' ? null : Number(f.get('minBeds')),
    maxBeds: f.get('maxBeds') === '' ? null : Number(f.get('maxBeds')),
    fullOnly: f.get('fullOnly') === 'on',
    ownersOnly: f.get('ownersOnly') === 'on',
    note: String(f.get('note') || ''),
  });
}
