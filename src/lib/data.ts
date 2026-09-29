import { demoManagers } from './demo-data';
import type { Manager, PublicManager } from './types';

// Data access. Today it reads demo data; it switches to Supabase once the
// managers table is seeded with researched profiles. Public callers only ever
// receive PublicManager — gated fields are stripped here, server side.

function toPublic(m: Manager): PublicManager {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { gated, ...pub } = m;
  return pub;
}

export async function managersForPostcode(postcode: string): Promise<PublicManager[]> {
  return demoManagers
    .filter((m) => m.postcodes.includes(postcode))
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    .map(toPublic);
}

export async function publicManager(slug: string): Promise<PublicManager | null> {
  const m = demoManagers.find((x) => x.slug === slug);
  return m ? toPublic(m) : null;
}

export async function allManagerSlugs(): Promise<string[]> {
  return demoManagers.map((m) => m.slug);
}

export function feeBand(m: Pick<PublicManager, 'feeMin' | 'feeMax'>): string {
  return m.feeMin === m.feeMax ? `${m.feeMin}%` : `${m.feeMin}–${m.feeMax}%`;
}

export const coveredPostcodes = Array.from(new Set(demoManagers.flatMap((m) => m.postcodes))).sort();
