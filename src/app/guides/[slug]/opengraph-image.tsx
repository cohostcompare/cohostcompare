import { guide } from '@/lib/guides';
import { OG_SIZE, ogCard } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'CoHostCompare guide';

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const g = guide((await params).slug);
  return ogCard('Owner guide', g?.short || 'Guides for owners', 'Plain-English guides for Australian short-term rental owners');
}
