'use server';

import { headers } from 'next/headers';
import { estimateEarnings, type Estimate } from '@/lib/earnings';

const hits = new Map<string, number[]>();

export async function getEstimate(lat: number, lng: number, bedrooms: number): Promise<Estimate | { error: string }> {
  if (![lat, lng, bedrooms].every(Number.isFinite)) return { error: 'Pick an address from the suggestions first.' };
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (recent.length >= 20) return { error: 'That’s a lot of estimates. Try again in an hour.' };
  hits.set(ip, [...recent, now]);
  return estimateEarnings(lat, lng, bedrooms);
}
