import { OG_SIZE, ogCard } from '@/lib/og';
import { feeLabel, publicManager } from '@/lib/data';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Short-term rental manager profile on CoHostCompare';

/** Share image for a manager profile: name, where they work and the public figures (fee band, rating, homes). */
export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const m = await publicManager((await params).slug).catch(() => null);
  if (!m) return ogCard('Manager profile', 'Short-term rental manager', 'Compare fees, guest ratings and homes nearby on CoHostCompare');
  const bits = [
    feeLabel(m) ? `Fees ${feeLabel(m)} of booking income` : null,
    m.avgRating ? `Guest rating ${m.avgRating.toFixed(2)}` : null,
    m.propertyCount ? `${m.propertyCount} homes tracked` : null,
  ].filter(Boolean);
  return ogCard(m.cities.slice(0, 2).join(' · ') || 'Australia', m.name, bits.length ? bits.join('  ·  ') : 'Compare with other managers and request a quote');
}
