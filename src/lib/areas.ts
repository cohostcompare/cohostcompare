import 'server-only';
import { adminClient } from '@/lib/supabase/server';

export type Area = { id: string; slug: string; label: string; city: 'Sydney' | 'Melbourne' | string; lat: number; lng: number; radiusMiles: number };

/** SEO area pages come from the sweep areas we have data for. */
export async function areas(): Promise<Area[]> {
  const { data, error } = await adminClient().from('sweep_cells').select('id, label, lat, lng, radius_miles').gt('listings_seen', 0).order('label');
  // On Vercel a failed read must not quietly become an empty page: throw so a build fails or a cached page is kept.
  if (error && process.env.VERCEL) throw new Error(`areas: ${error.message}`);
  const rows = (data || []).map((c) => ({
    id: c.id, short: c.id.replace(/^(syd|mel|nsw|vic)-/, ''), label: c.label, lat: c.lat, lng: c.lng, radiusMiles: Number(c.radius_miles || 1),
    city: c.id.startsWith('syd-') ? 'Sydney' : c.id.startsWith('mel-') ? 'Melbourne' : c.id.startsWith('nsw-') ? 'NSW holiday areas' : c.id.startsWith('vic-') ? 'Victorian holiday areas' : 'Australia',
  }));
  // Same short name in two cities (e.g. both CBDs): prefix the city to keep URLs unique.
  const dup = new Set(rows.map((r) => r.short).filter((x, i, a) => a.indexOf(x) !== i));
  return rows.map(({ short, ...r }) => ({ ...r, slug: dup.has(short) ? `${r.city.toLowerCase()}-${short}` : short }));
}

export async function area(slug: string) {
  return (await areas()).find((a) => a.slug === slug) || null;
}
