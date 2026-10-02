import type { MetadataRoute } from 'next';
import { areas } from '@/lib/areas';
import { GUIDES } from '@/lib/guides';
import { RULES } from '@/lib/rules';
import { adminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const BASE = 'https://www.cohostcompare.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/how-it-works', '/why-us', '/about', '/setup', '/rules', '/earnings', '/managers', '/partners', '/areas', '/guides', '/facts', '/privacy', '/terms'].map((p) => ({ url: `${BASE}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 }));
  const [ar, { data: mgrs }] = await Promise.all([areas(), adminClient().from('managers').select('slug, updated_at').eq('published', true)]);
  return [
    ...pages,
    ...GUIDES.map((g) => ({ url: `${BASE}/guides/${g.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...RULES.map((r) => ({ url: `${BASE}/rules/${r.code}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...ar.map((a) => ({ url: `${BASE}/areas/${a.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...(mgrs || []).map((m) => ({ url: `${BASE}/managers/${m.slug}`, lastModified: m.updated_at ? new Date(m.updated_at) : undefined, changeFrequency: 'weekly' as const, priority: 0.6 })),
  ];
}
