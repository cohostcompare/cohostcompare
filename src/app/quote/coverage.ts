'use server';

import { coveringSlugs } from '@/lib/data';

/** Returns which of the picked managers run homes near this point. */
export async function checkCoverage(lat: number, lng: number, slugs: string[], postcode?: string): Promise<string[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !slugs.length) return [];
  return [...(await coveringSlugs(lat, lng, slugs.slice(0, 5), postcode))];
}
