import { OG_SIZE, ogCard } from '@/lib/og';
import { RULES, RULES_CHECKED } from '@/lib/rules';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Short-term rental rules by state';

export default async function OG({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const r = RULES.find((x) => x.code === state);
  return ogCard('Short-stay rules', `Short-term rental rules in ${r?.name || 'Australia'}`, `Checked against official sources, ${RULES_CHECKED}`);
}
