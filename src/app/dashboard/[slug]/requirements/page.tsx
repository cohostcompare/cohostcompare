import type { Metadata } from 'next';
import Link from 'next/link';
import RequirementsForm from '@/components/RequirementsForm';
import { requireManager } from '@/lib/managers';
import { requirementsFor } from '@/lib/requirementsServer';
import { saveRequirements } from './actions';

export const metadata: Metadata = { title: 'Properties you take on', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Requirements({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { manager: m } = await requireManager(slug, `/dashboard/${slug}/requirements`);
  const r = (await requirementsFor([m.slug])).get(m.slug) ?? null;
  return (
    <main style={{ maxWidth: 720, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/dashboard" className="hint">← Dashboard</Link>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,36px)', margin: 0 }}>Properties {m.name} takes on</h1>
      <p style={{ margin: 0 }}>Set what you&apos;ll take on, so you only get quote requests you&apos;d actually quote for. Owners whose property doesn&apos;t match still see you in their results, in a separate list that explains why, but they can&apos;t send you a request. This never changes where you rank among the managers that do match.</p>
      <RequirementsForm action={saveRequirements} hidden={{ slug: m.slug }} r={r} />
      <p className="hint" style={{ margin: 0 }}>Leave everything as it is to keep receiving every request for homes near the ones you manage. Your requirements also show on your public profile, so owners know what you look for.</p>
    </main>
  );
}
