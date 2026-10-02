import { area } from '@/lib/areas';
import { OG_SIZE, ogCard } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Short-term rental managers by area';

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const a = await area((await params).slug);
  return ogCard(a?.city || 'Areas', `Short-term rental managers in ${a?.label || 'your area'}`, 'Fees, guest ratings and homes nearby, side by side. Up to 5 quotes, free.');
}
