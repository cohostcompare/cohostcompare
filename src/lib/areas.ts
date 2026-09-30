import 'server-only';
import { adminClient } from '@/lib/supabase/server';

export type Area = { slug: string; label: string; city: 'Sydney' | 'Melbourne' | string; lat: number; lng: number };

/** SEO area pages come from the sweep areas we have data for. */
export async function areas(): Promise<Area[]> {
  const { data } = await adminClient().from('sweep_cells').select('id, label, lat, lng').gt('listings_seen', 0).order('label');
  return (data || []).map((c) => ({
    slug: c.id.replace(/^(syd|mel)-/, ''), label: c.label, lat: c.lat, lng: c.lng,
    city: c.id.startsWith('syd-') ? 'Sydney' : c.id.startsWith('mel-') ? 'Melbourne' : 'Australia',
  }));
}

export async function area(slug: string) {
  return (await areas()).find((a) => a.slug === slug) || null;
}
