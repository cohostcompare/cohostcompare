import 'server-only';
import { adminClient } from '@/lib/supabase/server';

export type Area = { slug: string; label: string; city: 'Sydney' | 'Melbourne' | string; lat: number; lng: number };

/** SEO area pages come from the sweep areas we have data for. */
export async function areas(): Promise<Area[]> {
  const { data } = await adminClient().from('sweep_cells').select('id, label, lat, lng').gt('listings_seen', 0).order('label');
  const rows = (data || []).map((c) => ({
    short: c.id.replace(/^(syd|mel)-/, ''), label: c.label, lat: c.lat, lng: c.lng,
    city: c.id.startsWith('syd-') ? 'Sydney' : c.id.startsWith('mel-') ? 'Melbourne' : 'Australia',
  }));
  // Same short name in two cities (e.g. both CBDs): prefix the city to keep URLs unique.
  const dup = new Set(rows.map((r) => r.short).filter((x, i, a) => a.indexOf(x) !== i));
  return rows.map(({ short, ...r }) => ({ ...r, slug: dup.has(short) ? `${r.city.toLowerCase()}-${short}` : short }));
}

export async function area(slug: string) {
  return (await areas()).find((a) => a.slug === slug) || null;
}
