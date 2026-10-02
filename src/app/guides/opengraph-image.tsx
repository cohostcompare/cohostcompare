import { OG_SIZE, ogCard } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Guides for short-term rental owners';

export default function OG() {
  return ogCard('Guides', 'Guides for short-term rental owners', 'Fees, choosing a manager and the rules where your property is');
}
