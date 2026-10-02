import { OG_SIZE, ogCard } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Australian short-term rental manager market facts';

export default function OG() {
  return ogCard('Market facts', 'Australian short-term rental manager market facts', 'Live figures: managers by area, published fees and nightly rates');
}
